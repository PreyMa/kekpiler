
import {
  Extension, Token, CompoundRegularExpression, MessageSeverity, KekpilerImpl,
  IterationDecision, assert, assertNotReached
} from '../kekpiler.js';

const frontMatterBlockRegex= /(?<fmatr>^---+[^\S\n\r]*\r?\n([\s\S](?!---))*\r?\n---+)|/gm;
const simpleYamlRegex= new CompoundRegularExpression(
  /(?<delimiter>^---+$)|/gm,
  /^[^\S\r\n]*(((?<field>(\w+[^\S\r\n]*)+):[^\S\r\n]*)|(?<item>-[^\S\r\n]*))/,
  /((?<string>(.(?!#|\r?\n))*.)|(?<list>\r?\n(?=[^\S\r\n]*-)))|/,
  /(?<comment>#(.(?!\r?\n))*.?\r?\n)|/,
  /(?<error>\S.*)/
);

class FrontMatterBlock extends Token.Token {
  constructor( idx, text ) {
    super( idx );

    this._parseSimpleYaml( text );
  }

  // This parses a very very dumbed down version of yaml. Only key value pairs with single
  // line strings are supported and no type conversion takes place. Line comments
  // are allowed and single level lists of strings are supported. Indentation is
  // ignored alltogether. Only the bare minimum for declaring titles, tags and
  // thumbnail images is implemented, everything else results in a parse error.
  _parseSimpleYaml( text ) {
    let yamlStarted= false;
    let currentList= null;
    let currentListName= null;
    simpleYamlRegex.forEachMatch( text, match => {
      const {groups}= match;
      if( groups.error ) {
        return this._parseError(match, `(not all yaml syntax is supported): '${groups.error}'`);
      }

      if( groups.delimiter ) {
        // End of file
        if( yamlStarted ) {
          return IterationDecision.Break;
        }

        // Start of file
        yamlStarted= true;
        return;
      }

      assert( yamlStarted, 'Expected yaml begin before fields' );

      if( groups.list ) {
        if( !groups.field ) {
          return this._parseError(match, 'Expected field name for list');
        }

        currentList= [];
        currentListName= groups.field.trim();
        this._setYamlField( match, currentListName, currentList );
        return;
      }

      if( groups.item ) {
        if( !groups.string ) {
          return this._parseError(match, `Expected value for item in list '${currentListName}'`);
        }

        if( !currentList ) {
          return this._parseError(match, 'Unexpected list item');
        }

        currentList.push( groups.string.trim() );
        return;
      }

      if( groups.field ) {
        if( !groups.string ) {
          return this._parseError(match, `Expected value for field named '${groups.field}'`);
        }

        currentList= currentListName= null;
        this._setYamlField( match, groups.field.trim(), groups.string.trim() );
        return;
      }

      assertNotReached();
    });
  }

  _parseError( match, msg, level= null ) {
    const kek= KekpilerImpl.the();
    const {line, column}= kek.calcLineColumnFromSourceIndex( this.sourceIndex+ match.index );
    kek.addMessage( level || kek.config().badFrontMatterYamlMessageLevel, this, `(@${line+ 1}:${column+ 1}) Invalid front matter yaml. ${msg}` );
  }

  _setYamlField( match, name, value ) {
    const config= KekpilerImpl.the().config();
    if( Array.isArray(config.knownFrontMatterYamlKeys) ) {
      if( config.knownFrontMatterYamlKeys.indexOf(name) < 0 ) {
        this._parseError( match, `Unknown yaml field key '${name}'`, config.unknownFrontMatterYamlKeyMessageLevel );
      }
    }

    const yaml= config.frontMatterYaml;
    assert( yaml instanceof Map, 'Missing global front matter yaml key value storage' );
    if( yaml.has(name) ) {
      this._parseError( match, `Duplicate yaml field key '${name}'`, config.duplicateFrontMatterYamlKeyMessageLevel );
    }

    yaml.set( name, value );
  }

  render() { /* NOP */ }
}

export class FrontMatterExtension extends Extension {
  constructor() {
    super();
    this.yamlData= new Map();
  }

  init( kek ) {
    kek.setConfigDefaults({
      badFrontMatterYamlMessageLevel: MessageSeverity.Warning,
      unknownFrontMatterYamlKeyMessageLevel: MessageSeverity.Warning,
      duplicateFrontMatterYamlKeyMessageLevel: MessageSeverity.Warning,
      knownFrontMatterYamlKeys: ['title', 'tags', 'thumbnail']
    });
    kek.tokenizer().defineDocumentToken('fmatr', FrontMatterBlock, frontMatterBlockRegex);
  }

  preTokenize( kek ) {
    kek.config().frontMatterYaml= this.yamlData;
  }

  yaml() {
    return this.yamlData;
  }
}
