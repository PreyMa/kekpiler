import {
  CompoundRegularExpression, OpaqueHtmlBuilder, HtmlBuilder, HtmlBuilderNodeList,
  Token, assert, KekpilerImpl, HtmlElementBuilder, HtmlTextBuilder, Extension,
  MessageSeverity
} from '../kekpiler.js';

import { Options, ConfigurableToken } from './options.js';

const defaultTabSpaceCount= 2;
const splitLinesRegex= /\r?\n/gm;
const trailingWhitespaceRegex= /(?<=\S|^)[^\S\n\r]+(?=\n)/gm;
const lineMarkerRegex= new CompoundRegularExpression(
  /((?<start>\d+)(\s*-\s*(?<end>\d+))?)|(?<err>\S+)/gm
);

function charIsWhitespace( c ) {
  return ' \n\t\r\f\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'.indexOf(c) >= 0;
}

/**
* Html Highlighted Code Block Builder class
* If no line numbers or line markers are set the highlighted code consisting of
* spans and text are stored as an opaque block of html code.
**/
class HtmlHighlightedCodeBlockBuilder extends OpaqueHtmlBuilder {
  constructor( html ) {
    super(html, 'highlighted-code-block', true)
  }

  toLineElements() {
    const lines= this.html.split('\n');
    if( lines.length && !lines[lines.length-1].trim().length ) {
      lines.pop();
    }

    return lines.map( line =>
      new HtmlHighlightedCodeLineBuilder(
        new HtmlHighlightedCodeLineContentBuilder( line )
      )
    );
  }
}

/**
* Html Highlighted Code Line Content Builder class
* A single line of highlighted code as opaque html.
**/
class HtmlHighlightedCodeLineContentBuilder extends OpaqueHtmlBuilder {
  constructor( html ) {
    super(html, 'highlighted-code-line', true)
  }
}

/**
* Html Highlighted Code Line Builder class
* This class wraps the opaque html builder node of highlighted code line. It is a
* node list that can store other elements along side the highlighted code, but is
* not a tag based html element itself. It allows for prepending and appending other
* nodes to the highlighted code and automatically adds the new line character at the
* end when stringifying.
**/
class HtmlHighlightedCodeLineBuilder extends HtmlBuilderNodeList( HtmlBuilder ) {
  constructor( ...children ) {
    super();
    this.children= children;
  }

  toHtmlString( p ) {
    p.printNoBlock(() => {
      super.toHtmlString( p );
      p.print('\n');
    });
  }

  print( p ) {
    p.print('{Line}');
    p.printBlock(() => super.print(p) );
  }
}

let HighlightedCodeBlock;

function injectClassesImpl() {
  HighlightedCodeBlock= Token.Token.injectClass(
    class HighlightedCodeBlock extends ConfigurableToken( Token.Code.extend() ) {
      constructor(...args) {
        super(...args);

        this.markdownOptions= null;
        this.highlightedHtml= null;
        this.extensionConfig= null;

        this._parseMarkdownOptions();
      }

      setExtensionConfig( opt ) {
        this.extensionConfig= opt;
      }

      setOptions( options ) {
        this.markdownOptions.assign( options );
        this._processMarkdownOptions();
      }

      _parseMarkdownOptions() {
        if( !this.lang ) {
          return;
        }

        const kek= KekpilerImpl.the();
        const logger= kek.severityLogger( kek.config().badOptionsMessageLevel, this );

        let language= null;
        this.markdownOptions= new Options();
        this.markdownOptions.parseOptions( this.lang, logger, (name, value) => {
          if( value === true && language === null ) {
            language= name;
            return undefined;
          }
          return value;
        });

        this.lang= language ? language.toLowerCase() : language;

        this._processMarkdownOptions();
      }

      _processMarkdownOptions() {
        if( this.markdownOptions.offset ) {
          this.markdownOptions.offset= parseInt(this.markdownOptions.offset) || 0;
        }

        this._parseLineMarkers();
      }

      _parseLineMarkers() {
        const markerText= this.markdownOptions.marker;
        if( !markerText ) {
          return;
        }

        const markers= [];
        lineMarkerRegex.forEachMatch( markerText, match => {
          const groups= match.groups;
          if( groups.err ) {
            const kek= KekpilerImpl.the();
            kek.addMessage(kek.config().badOptionsMessageLevel, this, `Inavlid line marker number '${groups.err}' in code block options`);
            return;
          }

          const start= parseInt( groups.start );
          const end= groups.end ? parseInt( groups.end ) : start;

          for( let i= start; i<= end; i++ ) {
            markers.push(i);
          }
        });

        this.markdownOptions.marker= markers;
      }

      _trimWhitespaceIfEnabled() {
        if( !this.extensionConfig.trimWhitespace ) {
          return;
        }

        // Find the end of the last line of leading whitespace -> do not remove
        // the leading whitespace of the first line actually containing content
        let startIndex= 0;
        for( let i= 0; i!== this.text.length; i++ ) {
          const c= this.text[i];
          if( !charIsWhitespace(c) ) {
            break;
          }

          if( c === '\n' ) {
            startIndex= i+1;
          }
        }

        // Find the last character not being just whitespace
        let endIndex= this.text.length-1
        for(; endIndex > startIndex; endIndex-- ) {
          if( !charIsWhitespace( this.text[endIndex] ) ) {
            endIndex++;
            break;
          }
        }

        // Create substring and remove all traling whitespace from the end of lines
        this.text= this.text.substring(startIndex, endIndex).replaceAll(trailingWhitespaceRegex, '');
      }

      _normalizeTabsAndSpacesIfEnabled() {
        const doSpaces= this.extensionConfig.normalizeTabsToSpaces;
        const doTabs= this.extensionConfig.normalizeSpacesToTabs;

        // Convert tab characters into spaces
        if( typeof doSpaces !== 'undefined' ) {
          const spaceCount= typeof doSpaces === 'number' ? doSpaces : defaultTabSpaceCount;
          this.text= this.text.replaceAll('\t', ' '.repeat(spaceCount) );

        // Convert consecutive space characters into tabs
        } else if( typeof doTabs !== 'undefined' ) {
          const spaceCount= typeof doTabs === 'number' ? doTabs : defaultTabSpaceCount;
          const spaceRepetitionRegex= new RegExp(` {${spaceCount}}`, 'gm');
          this.text= this.text.replaceAll(spaceRepetitionRegex, '\t');
        }
      }

      _removeIndentIfEnabled() {
        if( !this.extensionConfig.removeIndent ) {
          return;
        }

        let indentPrefix= null;

        const lines= this.text.split( splitLinesRegex );
        lines.some( line => {
          // Ignore empty lines, as they are not required to have an indent
          if( !line.length ) {
            return;
          }

          // Stop if a line with content but no indent is found -> clearly there
          // is no global indent to remove
          const whitespaceMatch= line.match(/^\s+/);
          if( !whitespaceMatch ) {
            indentPrefix= null;
            return true;
          }

          // Lines only consisting of whitespace are not taken into account
          const leadingWhitespace= whitespaceMatch[0];
          if( leadingWhitespace.length !== line.length ) {
            if( !indentPrefix ) {
              indentPrefix= leadingWhitespace;
              return;
            }

            // Line is less indented -> make the global indent smaller
            if( leadingWhitespace.length < indentPrefix.length ) {
              // Indents don't match
              if( !indentPrefix.startsWith(leadingWhitespace) ) {
                indentPrefix= null;
                return true;
              }

              indentPrefix= leadingWhitespace;
              return;
            }

            // Line is indented more -> Indents still have to match
            if( leadingWhitespace.length > indentPrefix.length ) {
              if( !leadingWhitespace.startsWith(indentPrefix) ) {
                indentPrefix= null;
                return true;
              }
            }
          }
        });

        // No prefix to remove -> nothing to do here
        if( !indentPrefix ) {
          return;
        }

        let trimmedText= '';
        lines.forEach( line => {
          trimmedText+= line.substring( indentPrefix.length )+ '\n';
        });

        this.text= trimmedText;
      }

      highlightCode( kek ) {
        assert( this.extensionConfig, 'Missing highlighting options');

        this._trimWhitespaceIfEnabled();
        this._normalizeTabsAndSpacesIfEnabled();
        this._removeIndentIfEnabled();

        try {
          this.highlightedHtml= this.extensionConfig.highlightingFunction( this.text, this.lang );
        } catch( e ) {
          this.highlightedHtml= this.text;
          kek.addMessage(this.extensionConfig.highlightingFailureMessageLevel, this, 'Could not run highlighting function', e);
        }
      }

      _renderContent( preElem, codeElem ) {
        codeElem.clearChildren();

        // Add language name tag to the code block
        if( this.extensionConfig.showHighlightedLanguage ) {
          const langElem= new HtmlElementBuilder('div', new HtmlTextBuilder(this.lang) );
          langElem.addCssClass('mdkekcode-langname');
          preElem.appendChild( langElem );
        }

        // Check if conversion to line elements is necessary -> just return the html blob else
        const opaqueElem= new HtmlHighlightedCodeBlockBuilder( this.highlightedHtml );
        const showLineMarkers= this.extensionConfig.showLineMarkers && Array.isArray(this.markdownOptions.marker);
        if( !this.extensionConfig.showLineNumbers && !showLineMarkers ) {
          return codeElem.appendChild( opaqueElem );
        }

        const lineElements= opaqueElem.toLineElements();

        // Add line numbers after the <code> element
        let lineNumberContainer= null;
        if( this.extensionConfig.showLineNumbers ) {
          lineNumberContainer= new HtmlElementBuilder('div');
          lineNumberContainer.addCssClass('mdkekcode-linenumbers');
          codeElem.addCssClass('mdkekcode-linenumbers');

          // Make more space if the line numbers have three digits (or two and a minus sign)
          const offset= this.extensionConfig.lineNumberOffset+ (this.markdownOptions.offset || 0)+ 1;
          if( lineElements.length+ offset >= 100 || lineElements.length+ offset <= -10 ) {
            lineNumberContainer.addCssClass('mdkekcode-manylines');
            codeElem.addCssClass('mdkekcode-manylines');
          }

          for( let i= 0; i!== lineElements.length; i++ ) {
            const lineNum= i+ offset;
            const lineTag= new HtmlElementBuilder('span',
              new HtmlElementBuilder('span',
                new HtmlHighlightedCodeLineBuilder(
                  new HtmlTextBuilder(''+ lineNum)
                )
              )
            );
            lineNumberContainer.appendChild( lineTag );
          }

          preElem.appendChild( lineNumberContainer );
        }

        // Add line markers
        if( showLineMarkers ) {
          const markers= this.markdownOptions.marker.sort((a, b) => a- b);
          for( let i= 0; i < markers.length; i++ ) {
            // Skip invalid indices
            const lineIdx= markers[i]- 1;
            if( lineIdx < 0 || lineIdx >= lineElements.length ) {
              continue;
            }

            // Skip lines alrady wrapped
            const line= lineElements[lineIdx];
            const prevLineIdx= i ? markers[i-1] -1 : null;
            if( prevLineIdx === line || !line.is(HtmlHighlightedCodeLineBuilder) ) {
              continue;
            }

            // Find next index by skipping repetitions
            let nextLineIdx= lineIdx;
            while( i < markers.length-1 && nextLineIdx === lineIdx ) {
              nextLineIdx= markers[++i]- 1;
            }
            i--;

            // Select fitting css class -> eg. # is a marked line
            // 1: # .marked-first <- block of marked lines
            // 2: # .marked
            // 3: # .marked
            // 4: # .marked-last
            // 5:
            // 6: # .marked-first-last <- single marked line
            // 7:
            // 8: # .marked-first-last
            const isFirstLine= prevLineIdx === null || prevLineIdx !== lineIdx-1;
            const isLastLine= lineIdx === nextLineIdx || nextLineIdx- lineIdx > 1;

            let cssClassName;
            if( isFirstLine && isLastLine ) {
              cssClassName= 'mdkekcode-marked-first-last';
            } else if( isFirstLine ) {
              cssClassName= 'mdkekcode-marked-first';
            } else if( isLastLine ) {
              cssClassName= 'mdkekcode-marked-last';
            } else {
              cssClassName= 'mdkekcode-marked';
            }

            const wrappedLine= new HtmlElementBuilder('span', line);
            wrappedLine.addCssClass( cssClassName );
            lineElements[lineIdx]= wrappedLine;

            if( lineNumberContainer ) {
              lineNumberContainer.childNode( lineIdx ).addCssClass( cssClassName );
            }
          }
        }

        codeElem.appendChild( lineElements );
      }

      render() {
        const text= this.text;
        this.text= '';
        const elem= super.render();

        this.text= text;

        const preElem= elem.descendantWithTagname('pre');
        assert( preElem instanceof HtmlElementBuilder, 'Could not query <pre> element in virtual dom' );

        const codeElem= preElem.descendantWithTagname('code');
        assert( codeElem instanceof HtmlElementBuilder, 'Could not query <code> element in virtual dom' );

        this._renderContent( preElem, codeElem );
        this.extensionConfig.codeElementCSSClasses.forEach( c => codeElem.addCssClass(c) );

        return elem;
      }
    }
  );
}

export class CodeHighlightExtension extends Extension {
  init( kek ) {
    kek.setConfigDefaults({
      trimWhitespace: true,
      normalizeTabsToSpaces: defaultTabSpaceCount,
      normalizeSpacesToTabs: undefined,
      removeIndent: true,
      highlightingFunction: (txt, lang) => txt,
      showLineNumbers: true,
      showLineMarkers: true,
      lineNumberOffset: 0,
      showHighlightedLanguage: true,
      codeElementCSSClasses: ['mdkekcode'],
      highlightingFailureMessageLevel: MessageSeverity.Warning
    });
    return 'CodeHighlight';
  }

  injectClasses() {
    injectClassesImpl();
  }

  preRender( kek ) {
    kek.document.forEachOfType(HighlightedCodeBlock, token => {
      token.setExtensionConfig( kek.config() );
      token.highlightCode( kek );
    });
  }
}
