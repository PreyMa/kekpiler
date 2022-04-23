

const sectionRegex= /(?<comm><!--[\s\S]*?-->)|(?<head>[^\S\r\n]*#+.+)|(?<code>```(.+\r?\n)?([\s\S](?!```))*[\s\S](```)?)|(?<box>:::(.+\r?\n)?([\s\S](?!:::))*[\s\S](:::)?)|(?<img>!\[.*\]((\(.*\))|(\[.*\])))|(?<block>@\[.+\]((\(.*\))|(\[.*\])))|(?<ref>[^\S\r\n]*\[.+\]\:.+)|(?<item>[^\S\r\n]*[\*\+-][^\S\r\n]((```([\s\S](?!```))*[\S\s]``)|[\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n\r?\n(?![^\S\r\n]+\S))))*.)|(?<enum>[^\S\r\n]*\d+\.[^\S\r\n]((```([\s\S](?!```))*[\S\s]``)|[\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n\r?\n(?![^\S\r\n]+\S))))*.)|(?<table>(\|[^\|\r\n]+)+\|?[^\S\r\n]*\r?\n[^\S\r\n]*(\|[^\S\r\n]*[:-]-+[:-][^\S\r\n]*)+\|?[^\S\r\n]*\r?\n([^\S\r\n]*(\|[^\|\r\n]+)+\|?[^\S\r\n]*\r?\n)*)|(?<quote>[^\S\r\n]*>([\s\S](?!(\r?\n([^\S\r\n]*>[^\S\r\n]*)?\r?\n)|(\r?\n(```|:::))|([!@]\[.*\]((\(.*\))|(\[.*\])))))*[\S\s](\r?\n[^\S\r\n]*>[^\S\r\n]*$)*)|(?<par>(?=\S)([\s\S](?!(\r?\n\r?\n)|(\r?\n(```|:::))|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n[^\S\r\n]*([\*\+-]|(\d+\.))[^\S\r\n])))*[\S\s])|(?<hdiv>\r?\n[^\S\r\n]*\r?\n[^\S\r\n]*\r?\n\s*)|(?<sdiv>\r?\n[^\S\r\n]*\r?\n[^\S\r\n]*)/gm;

const itemPrefixRegex= /[^\S\r\n]*([\*\+-]|(\d+\.))/gm;
const containerBoxRegex= /(?<code>```(.+\r?\n)?([\s\S](?!```))*[\s\S](```)?)|(?<item>[^\S\r\n]*[\*\+-][^\S\r\n]((```([\s\S](?!```))*[\S\s]``)|[\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|(\r?\n\r?\n(?![^\S\r\n]+\S))))*.)|(?<enum>[^\S\r\n]*\d+\.[^\S\r\n]((```([\s\S](?!```))*[\S\s]``)|[\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|(\r?\n\r?\n(?![^\S\r\n]+\S))))*.)|(?<par>(?=\S)([\s\S](?!(\r?\n\r?\n)|([^\S\r\n]*```)|(\r?\n[^\S\r\n]*([\*\+-]|(\d+\.))[^\S\r\n])))*[\S\s])|(?<sdiv>\r?\n[^\S\r\n]*\r?\n[^\S\r\n]*)/gm;
const paragraphRegex= /(?<esc>\\[`_~*\\\[])|(?<icode2>``([\S\s](?!``))*.``)|(?<icode>`(?!`)([\S\s](?!`))*.`)|(?<link>\[.*\]((\(.*\))|(\[.*\])))|(?<style>(?<s1>___|\*\*\*|__|\*\*|[_~\*])([\S\s](?!\k<s1>))*.\k<s1>)|(?<text>([\s\S](?![`_~*\\\[]))*.)/gm;
const tableRegex= /(?<thead>\|([^\S\r\n]*[:-]-+[:-][^\S\r\n]*\|)+[^\S\r\n]*\r?\n)|(?<tdiv>\|?[^\S\r\n]*\r?\n)|(?<tcell>\|((\\\|)|[^\|\r\n])+)/gm;

function assert( cond, msg= 'Assertion failed' ) {
  if( !cond ) {
    msg= typeof msg === 'function' ? msg() : msg;
    throw new Error( msg );
  }
}

function abstractMethod() {
  throw Error('Abstract method');
}

function charIsWhitespace( c ) {
  return ' \t\n\r\v'.indexOf(c) !== -1;
}

class Enum {
  constructor( obj ) {
    this.__construct( obj );
  }

  static initPlainObject( obj ) {
    Object.setPrototypeOf(obj, Enum.prototype);
    obj.__construct( obj );
  }

  __construct( obj ) {
    this._count= 0;
    this._addKeys( obj );
  }

  __enumerate() {
    let counter= 0;
    this._count= 0;

    for(const key in this) {
      if( typeof key === 'string' && key[0] !== '_' ) {
        this[key]= counter++;
      }
    }

    this._count= counter;
  }

  _addKeys( obj ) {
    Object.assign(this, obj);
    this.__enumerate();
  }
}

class ArrayIterator {
  constructor( a ) {
    this.array= a;
    this.idx= -1;
  }

  hasNext() {
    return this.idx < this.array.length-1;
  }

  get() {
    return this.array[this.idx];
  }

  peek() {
    return this.array[this.idx+ 1];
  }

  next() {
    this.idx++;
    return this.get();
  }
}

class Printer {
  constructor() {
    this.buffer= '';
  }

  push() {
    return this;
  }

  pop() {
    return this;
  }

  print( ...vals ) {
    this.buffer+= vals.join(' ')+ '\n';
    return this;
  }

  printBlock( fn ) {
    this.push();
    fn();
    this.pop();
    return this;
  }

  string() {
    return this.buffer;
  }
}

class IndentPrinter extends Printer {
  constructor( indent= 2 ) {
    super();
    this.level= 0;
    this.indent= indent;
    this.indentStr= '';
  }

  push() {
    this.level+= this.indent;
    this.indentStr += ''.padStart(this.indent);
    return this;
  }

  pop() {
    this.level= Math.max(0, this.level- this.indent);
    this.indentStr= this.indentStr.substring(0, this.level);
    return this;
  }

  print( ...vals ) {
    this.buffer+= this.indentStr + vals.join(' ').split('\n').join( '\n'+ this.indentStr )+ '\n';
    return this;
  }
}

class HtmlBuilder {
  toHtmlString() {
    abstractMethod();
  }

  print( p ) {
    abstractMethod();
  }
}

class HtmlElementBuilder extends HtmlBuilder {
  constructor( tagName, ...children ) {
    super();
    this.tagName= tagName;
    this.children= children;
    this.cssClasses= null;
    this.attributes= null;
  }

  appendChild( c ) {
    if( c ) {
      this.children.push(c);
    }
  }

  addCssClass( name ) {
    if( !this.cssClasses ) {
      this.cssClasses= new Set();
    }

    this.cssClasses.add( name );
  }

  setAttribute( name, value ) {
    // Todo: Attribute escaping!
    if( !this.attributes ) {
      this.attributes= new Map();
    }

    this.attributes.set(name, value);
  }

  toHtmlString( p ) {
    let classes= '', attributes= '';
    if( this.cssClasses ) {
      classes= ` class="${Array.from(this.cssClasses).join(' ')}"`;
    }
    if( this.attributes ) {
      this.attributes.forEach( (attr, key) => {
        attributes+= ` ${key}="${attr}"`;
      });
    }

    p.print(`<${this.tagName}${classes}${attributes}>`).printBlock(() => {
      this.children.forEach( c => {
        c.toHtmlString( p );
      });
    }).print(`</${this.tagName}>`);
  }

  print( p ) {
    p.print(`<${this.tagName}>`);

    p.printBlock(() => {
      if( this.cssClasses ) {
        this.cssClasses.forEach( c => p.print('- class', c) );
      }
      if( this.attributes ) {
        this.attributes.forEach( (a, k) => p.print(`- attr ${k}:`, a) );
      }
      this.children.forEach( c => {
        console.log( c );
        c.print( p );
      });
    });
  }
}

class HtmlTextBuilder extends HtmlBuilder {
  constructor( text, escapeText= true ) {
    super();

    // Todo: Text escaping
    this.text= text;
  }

  toHtmlString( p ) {
    p.print( this.text );
  }

  print( p ) {
    p.print( this.text );
  }
}

class Tokenizer {
  static _tokenize( text, regex) {
    const tokens= [];

    // Create new state
    regex= new RegExp( regex );

    let match;
    while((match= regex.exec(text)) !== null) {
      const token= Token.createFromMatch( match );
      if( !token ) {
        continue;
      }

      tokens.push( token );
    };

    return tokens;
  }

  static tokenizeDocument( text ) {
    return Tokenizer._tokenize( text, sectionRegex );
  }

  static tokenizeContainerBox( text ) {
    return Tokenizer._tokenize( text, containerBoxRegex );
  }

  static tokenizeParagraph( text ) {
    return Tokenizer._tokenize( text, paragraphRegex );
  }

  static tokenizeTable( text ) {
    return Tokenizer._tokenize( text, tableRegex );
  }
}

class TextStyle {
  render() {
    abstractMethod();
  }

  addStyle( otherStyle ) {
    return new MultiTextStyle(this, otherStyle);
  }
}

class NoneStyle extends TextStyle {
  render( element ) {
    return element;
  }

  addStyle( otherStyle ) {
    return otherStyle;
  }
}

class MultiTextStyle extends TextStyle {
  constructor(oldStyle, newStyle) {
    super();
    this.ownStyle= newStyle;
    this.restStyle= oldStyle;
  }

  render( element ) {
    return this.ownStyle.render( this.restStyle.render( element ) );
  }
}

class StrikeThroughStyle extends TextStyle {
  render( element ) {
    return new HtmlElementBuilder('s', element);
  }
}

class StrongStyle extends TextStyle {
  render( element ) {
    return new HtmlElementBuilder('strong', element);
  }
}

class EmphasisedStyle extends TextStyle {
  render( element ) {
    return new HtmlElementBuilder('em', element);
  }
}

class CodeStyle extends TextStyle {
  render( element ) {
    return new HtmlElementBuilder('code', element);
  }
}

/**
* Resource Token Mixin Class
* This mixin parses resource blocks like images, links, custom blocks and makes the
* appropriate requests to the compiler
*/
function ResourceToken( klass ) {
  return class RessourceToken extends klass {
    constructor( text, offset, ...args ) {
      super(...args);

      const splitIdx= text.indexOf(']');
      assert( text[offset] === '[' );
      assert( splitIdx > 0 );

      this.text= text.substring(offset+1, splitIdx);
      this.resource= null;
      this.reference= null;
      this.resourceUrl= null;

      // Either make a request or a reference request to the compiler
      const refOrResName= text.substring(splitIdx+2, text.length-1).trim();
      if( text[splitIdx+1] === '(' ) {
        this.resource= refOrResName;
        Kekpiler.the().requestResource( this );
      } else {
        this.reference= refOrResName;
        Kekpiler.the().requestReference( this );
      }
    }

    resourceName() {
      return this.resource;
    }

    referenceName() {
      return this.reference;
    }

    setResourceName( name ) {
      this.resource= name;
    }

    _onResourceUrl() {}

    trySetResourceUrl( url ) {
      if( !this.resourceUrl ) {
        this.resourceUrl= url;
        this._onResourceUrl();
      }
      return this.resourceUrl;
    }

    resourceType() {
      abstractMethod();
    }
  };
}

const TableColumnAlignment= {
  Center: 0,
  Left: 0,
  Right: 0,
}
Enum.initPlainObject(TableColumnAlignment);

class IterationDecisionType {}
const IterationDecision= {
  Continue: new IterationDecisionType(),
  Break:    new IterationDecisionType()
};

const TokenType= {
  Code: 0,
  ContainerBox: 0,
  CustomBlock: 0,
  DivisionToken: 0,
  Document: 0,
  EnumerationItem: 0,
  EscapedText: 0,
  HardDivision: 0,
  Header: 0,
  Image: 0,
  InlineCode: 0,
  ItemizedItem: 0,
  Link: 0,
  List: 0,
  Paragraph: 0,
  Quote: 0,
  Reference: 0,
  SoftDivision: 0,
  StyledText: 0,
  Table: 0,
  TableCell: 0,
  TableHeaderCell: 0,
  TableHeaderDivision: 0,
  TableHeaderRow: 0,
  TableRow: 0,
  TableRowDivision: 0,
  Text: 0,
};
Enum.initPlainObject( TokenType );

class Token {
  static createFromMatch( match ) {
    const groups= match.groups;
    let key= null;
    for( key in groups ) {
      if( groups[key] ) {
        break;
      }
    }

    assert( key !== null, 'Unknown matching group' );
    if( !TokenMatchGroups[key] ) {
      return null;
    }

    return TokenMatchGroups[key].create(groups[key]);
  }

  static _resolveTokenClass( baseClass ) {
    if( !baseClass._injectedClass ) {
      return baseClass;
    }

    return baseClass._injectedClass;
  }

  static injectClass( baseClass, newClass ) {
    let k= newClass;
    while( k ) {
      if( k === baseClass ) {
        baseClass._injectedClass= newClass;
        return;
      }

      k= Object.getPrototypeOf( k );
    }

    throw new Error(`Injected class has to inherit from the overriden base class. '${newClass.name}' does not inherit from '${baseClass.name}'`);
  }

  static create(...args) {
    const klass= Token._resolveTokenClass( this );
    return new klass(...args);
  }

  name() {
    return this.constructor.name;
  }

  type() {
    return this.constructor._tokenType;
  }

  is( t ) {
    return this.type() === t;
  }

  print( p ) {
    p.print( this.name() );
  }

  consumeTokens( it ) {
    return this;
  }

  render( p ) {
    abstractMethod();
  }
}

class DivisionToken extends Token {
  render() {}
}
DivisionToken._tokenType= TokenType.DivisionToken;

class ParentToken extends Token {
  constructor() {
    super();
    this.children= [];
  }

  appendChild( c ) {
    this.children.push( c );
    return c;
  }

  hasChildren() {
    return !!this.children.length;
  }

  _printSelf( p ) {
    super.print( p );
  }

  print( p ) {
    this._printSelf( p );
    p.printBlock(() => {
      this.children.forEach( c => {
        c.print( p );
      });
    });
  }

  _htmlElementTag() {
    abstractMethod();
  }

  _renderChildren( elem ) {
    this.children.forEach( c => {
      elem.appendChild( c.render() );
    });
  }

  render() {
    const elem= new HtmlElementBuilder(this._htmlElementTag());
    this._renderChildren( elem );
    return elem;
  }

  _createChildrenFromTokenList( tokens ) {
    const it= new ArrayIterator( tokens );

    while( it.hasNext() ) {
      let child= it.next();
      child= child.consumeTokens( it );

      if( child ) {
        this.children.push( child );
      }
    }
  }

  forEach( fn ) {
    if( fn( this ) === IterationDecision.Break ) {
      return IterationDecision.Break;
    }

    const x= this.children.some( c => {
      if( c instanceof ParentToken ) {
        if( c.forEach( fn ) === IterationDecision.Break ) {
          return true;
        }
      } else {
        if( fn( c ) === IterationDecision.Break ) {
          return true;
        }
      }
    });

    if( x ) {
      return IterationDecision.Break;
    }
  }

  forEachOfType( klass, fn ) {
    return this.forEach( tk => {
      if( tk instanceof klass ) {
        return fn( tk );
      }
    });
  }
}

class Paragraph extends ParentToken {
  constructor( text ) {
    super();

    if( text === null ) {
      return;
    }

    const tokens= Tokenizer.tokenizeParagraph( text );
    this._createChildrenFromTokenList( tokens );
  }

  _htmlElementTag() {
    return 'p';
  }
}
Paragraph._tokenType= TokenType.Paragraph;

class Quote extends ParentToken {

}
Quote._tokenType= TokenType.Quote;

class ContainerBox extends ParentToken {
  constructor( text ) {
    super();
    assert( text[2] === ':' );

    const endOfLine= text.indexOf('\n')+ 1;
    this.containerType= text.substring(3, endOfLine).trim();

    const content= text.substring(endOfLine, text.length- 3)
    const tokens= Tokenizer.tokenizeContainerBox( content );
    this._createChildrenFromTokenList( tokens );
  }

  _htmlElementTag() {
    return 'div';
  }

  render() {
    const elem= super.render();
    if( this.containerType ) {
      elem.addCssClass( this.containerType );
    }

    return elem;
  }
}
ContainerBox._tokenType= TokenType.ContainerBox;


class Document extends ParentToken {
  constructor( text ) {
    super();

    const tokens= Tokenizer.tokenizeDocument( text );
    this._createChildrenFromTokenList( tokens );
  }

  _htmlElementTag() {
    return 'article';
  }
}
Document._tokenType= TokenType.Document;

class List extends ParentToken {
  constructor( tokens, useParagraph= false ) {
    super();
    this.children= tokens;

    this.paragraphMode= useParagraph;
    this.children.forEach( c => c.hoistParagraphContent= !useParagraph );
  }

  _printSelf( p ) {
    p.print('List', this.paragraphMode ? '-PAR-' : '');
  }

  _htmlElementTag() {
    if( this.hasChildren() ) {
      return this.children[0].listElementTag();
    }

    return 'ul';
  }
}
List._tokenType= TokenType.List;

class ListItemToken extends ParentToken {
  constructor( text ) {
    super();

    this.hoistParagraphContent= false;

    // Count whitespace to remove
    let wsLength= 0;
    while( charIsWhitespace(text[wsLength]) ) {
      wsLength++;
    }

    const wsRegex= (new RegExp(`\\r?\\n[^\\S\\r\\n]{0,${wsLength+2}}`, 'gm'));

    // Tokenize
    const prefixLength= (new RegExp(itemPrefixRegex)).exec( text )[0].length;
    const content= text.substring( prefixLength ).replace( wsRegex, '\n' );
    const tokens= Tokenizer.tokenizeContainerBox( content );
    this._createChildrenFromTokenList( tokens );
  }

  _findNeighbouringTokens( it ) {
    const tokens= [ this ];

    let mightUseParagraph= false;
    let useParagraph= !this._onlyContainsParagraphAndSublist();
    while( it.hasNext() ) {
      const token= it.peek();
      if( token.is(TokenType.HardDivision) ) {
        break;

      // This indicates that paragraphs are used, but only mark the list as paragraph
      // mode if another list item follows
      } else if( token.is(TokenType.SoftDivision) ) {
        mightUseParagraph= true;
        it.next();

      // Set paragraph mode for the list, if either a soft div was found or the item
      // itself contains paragraphs
      } else if( token.is(this.type()) ) {
        useParagraph= useParagraph || mightUseParagraph || !token._onlyContainsParagraphAndSublist();
        tokens.push( token );
        it.next();

      } else {
        break;
      }
    }

    return {tokens, useParagraph};
  }

  consumeTokens( it ) {
    const {tokens, useParagraph}= this._findNeighbouringTokens( it );
    return List.create( tokens, useParagraph );
  }

  _htmlElementTag() {
    return 'li';
  }

  _renderChildren( element ) {
    if( !this.children.length ) {
      return;
    }

    // Print the contents of the first paragraph directly into the own body
    // and render an list element if one follows
    if( this.hoistParagraphContent ) {
      this.children[0]._renderChildren( element );

      if( this.children.length === 2 ) {
        element.appendChild( this.children[1].render() );
      }
      return;
    }

    super._renderChildren( element );
  }

  _onlyContainsParagraphAndSublist() {
    const cs= this.children;
    const len= cs.length;
    return len <= 2 && cs[0].is(TokenType.Paragraph) && (len === 1 || (cs[1].is(TokenType.List) && !cs[1].paragraphMode));
  }

  _printSelf( p ) {
    p.print('- Item');
  }
}

class ItemizedItem extends ListItemToken {
  listElementTag() {
    return 'ul';
  }
}
ItemizedItem._tokenType= TokenType.ItemizedItem;

class EnumerationItem extends ListItemToken {
  listElementTag() {
    return 'ol';
  }
}
EnumerationItem._tokenType= TokenType.EnumerationItem;


class TextToken extends Token {
  constructor( text= null ) {
    super();
    this.text= text;
  }

  print( p ) {
    p.print(`"${this.text}"`);
  }

  render( p ) {
    return new HtmlTextBuilder( this.text );
  }
}
TextToken._tokenType= TokenType.Text;


class EscapedText extends TextToken {
  constructor( text ) {
    // Remove the back slash
    super( text[1] );
  }
}
EscapedText._tokenType= TokenType.EscapedText;


class Header extends TextToken {
  constructor( text ) {
    super();
    text= text.trim();

    let cnt= 0;
    while( text[cnt] === '#' ) {
      cnt++;
    }

    this.level= Math.max(1, cnt);
    this.text= text.substring(cnt+ 1);
  }

  print( p ) {
    p.print('#'.repeat(this.level), this.text);
  }

  render() {
    return new HtmlElementBuilder('h'+ this.level, new HtmlTextBuilder(this.text));
  }
}
Header._tokenType= TokenType.Header;


class Code extends TextToken {
  constructor( text ) {
    super();
    assert( text.substring(0,3) === '```', 'Expected code block to start with ```' );

    // Remove begin and end sequence, and extract language name
    const endOfLine= text.indexOf('\n')+ 1;
    this.lang= text.substring(3, endOfLine).trim();
    this.text= text.substring(endOfLine, text.length-3);
  }

  print( p ) {
    p.print('Code [', this.lang, ']').push().print(this.text).pop();
  }

  render() {
    return new HtmlElementBuilder('pre',
              new HtmlElementBuilder('code',
                new HtmlTextBuilder(this.text)));
  }
}
Code._tokenType= TokenType.Code;


class StyledText extends TextToken {
  constructor( text ) {
    super();

    let emphasisCount= 0;
    let strikeThrough= false;
    let i;
    for(i= 0; i!== text.length / 2; i++ ) {
      const c= text[i];
      const d= text[text.length- 1- i];

      if( c !== d ) {
        break;
      }

      switch( c ) {
        case '~':
          strikeThrough= true;
          break;

        case '_':
        case '*':
          emphasisCount++;
          break;
      }
    }

    this.style= new NoneStyle();
    if( emphasisCount ) {
      this.style= this.style.addStyle( DefaultStyle.emphasis[emphasisCount-1] );
    }
    if( strikeThrough ) {
      this.style= this.style.addStyle( DefaultStyle.strikeThrough );
    }

    this.text= text.substring( i, text.length- i );
  }

  print( p ) {
    p.print(`<"${this.text}">`, this.style.constructor.name);
  }

  render() {
    return this.style.render( super.render() );
  }
}
StyledText._tokenType= TokenType.StyledText;

class InlineCode extends TextToken {
  constructor( text ) {
    const off= ( text[1] === '`' && text[text.length-2] === '`') ? 2 : 1;
    super( text.substring( off, text.length- off) );
  }

  render() {
    return DefaultStyle.code.render( super.render() );
  }
}

class Link extends ResourceToken(TextToken) {
  constructor( text ) {
    super( text, 0 );
  }

  resourceType() {
    return 'link';
  }

  render() {
    const elem= new HtmlElementBuilder('a', super.render());
    elem.setAttribute('href', this.resourceUrl);
    return elem;
  }
}


class Table extends ParentToken {
  constructor( text ) {
    super();
    this.fallBackText= text;

    console.log('Table:', text );

    const tokens= Tokenizer.tokenizeTable( text );
    const it= new ArrayIterator( tokens );

    if( !it.hasNext() ) {
      return;
    }

    // Make the header row the first child by default
    const header= new TableHeaderRow();
    this.appendChild( header );

    // Get all cells that make up the header until the header div is reached
    while( it.hasNext() ) {
      const tk= it.next();
      if( tk.is(TokenType.TableCell) ) {
        header.appendChild( tk );

      } else if( tk.is(TokenType.TableRowDivision) ) {
        break;

      } else {
        console.log('UNEXPECTED HEADER CHILD', tk);
        this.children= [];
        return;
      }
    }

    if( !it.hasNext() || !it.next().is(TokenType.TableHeaderDivision) ) {
      console.log('EXPECTED LAYOUT', it.get());
      this.children= [];
      return;
    }

    const tableLayout= it.get();

    // Layout and header row need to have the same number of columns
    const columnCount= tableLayout.columnCount();
    if( columnCount !== header.children.length ) {
      console.log('LAYOUT COLS DON\'T MATCH', columnCount, header.children.length);
      this.children= [];
      return;
    }

    let expectNewRow= true, row= null;
    while( it.hasNext() ) {
      row= this.children[this.children.length-1];

      const tk= it.next();
      switch( tk.type() ) {
        case TokenType.TableCell:
          if( expectNewRow ) {
            row= this.appendChild( new TableRow(columnCount) );
            expectNewRow= false;
          }
          row.appendChild( tk );
          break;

        case TokenType.TableHeaderDivision:
          row= this.appendChild( tk.toTableRow() );
          expectNewRow= true;
          break;

        case TokenType.TableRowDivision:
          expectNewRow= true;
          break;

        default:
          console.log('UNEXPECTED CELL CHILD', tk);
          this.children= [];
          return;
      }
    }

    this.children.forEach( c => {
      c.setLayout( tableLayout );
    });

    this.fallBackText= null;
  }

  render() {
    if( this.fallBackText ) {
        return new HtmlElementBuilder('p', new HtmlTextBuilder(this.fallBackText));
    }

    const elements= this.children.map( c => c.render() );
    const headerElement= elements[0];
    elements.shift();

    return new HtmlElementBuilder('table',
                new HtmlElementBuilder('thead', headerElement),
                new HtmlElementBuilder('tbody', ...elements));
  }
}
Table._tokenType= TokenType.Table;

class TableRow extends ParentToken {
  constructor( columnCount= -1 ) {
    super();
    this.columnCount= columnCount;
  }

  appendChild( c ) {
    // Ignore new children if the row is already full
    if( this.columnCount > 0 && this.children.length === this.columnCount ) {
      return;
    }

    return super.appendChild( c );
  }

  /**
  * @param{TableHeaderDivision} layout
  */
  setLayout( layout ) {
    this.children.forEach( (col, idx) => {
      col.setLayout( layout.layoutForColumn( idx ).alignment );
    });
  }

  _htmlElementTag() {
    return 'tr';
  }
}
TableRow._tokenType= TokenType.TableRow;

class TableHeaderRow extends TableRow {
  appendChild( cell ) {
    super.appendChild( cell.toHeaderCell() );
  }
}
TableHeaderRow._tokenType= TokenType.TableHeaderRow;

class TableCell extends Paragraph {
  constructor( text ) {
    // (Shallow) copy construct
    if( text instanceof TableCell ) {
      super( null );
      Object.assign(this, text);
      return;
    }

    // Init internal paragraph with text (without the pipe symbol)
    super( text.substring(1) );
    this.alignment= TableColumnAlignment.Left;
  }

  _htmlElementTag() {
    return 'td';
  }

  toHeaderCell() {
    return new TableHeaderCell( this );
  }

  setLayout( alignment ) {
    this.alignment= alignment;
  }
}
TableCell._tokenType= TokenType.TableCell;

class TableHeaderCell extends TableCell {
  _htmlElementTag() {
    return 'th';
  }
}
TableHeaderCell._tokenType= TokenType.TableHeaderCell;

class TableHeaderDivision extends DivisionToken {
  constructor( text ) {
    super();
    this.text= text.trim();

    assert( this.text[0] === '|' );
    assert( this.text[this.text.length-1] === '|' );

    // Manually break up the row into cells
    this.columns= [];
    this.text.substring(1, this.text.length-1).split('|').forEach( col => {
      col= col.trim();

      // Use left alignment as the default
      let alignment= TableColumnAlignment.Left;
      if( col[col.length-1] === ':' ) {
        alignment= col[0] === ':' ? TableColumnAlignment.Center : TableColumnAlignment.Right;
      }

      this.columns.push({
        text: col,
        alignment
      });
    });
  }

  toTableRow() {
    const row= new TableRow();
    this.columns.forEach( c => row.appendChild(new TableCell(c.text)) );
    return row;
  }

  layoutForColumn( idx ) {
    return this.columns[idx];
  }

  columnCount() {
    return this.columns.length;
  }
}
TableHeaderDivision._tokenType= TokenType.TableHeaderDivision;

class TableRowDivision extends DivisionToken {}
TableRowDivision._tokenType= TokenType.TableRowDivision;


class Image extends ResourceToken( Token ) {
  constructor( text ) {
    super( text, 1 );
    assert( text[0] === '!' );
  }

  resourceType() {
    return 'image';
  }

  render() {
    const elem= new HtmlElementBuilder('img');
    elem.setAttribute('src', this.resourceUrl);
    elem.setAttribute('alt', this.text);

    return elem;
  }
}
Image._tokenType= TokenType.Image;


class CustomBlock extends ResourceToken(Token) {
  constructor( text ) {
    super(text, 1);

    // Rename the inner text to better reflect its purpose
    this.blockType= this.text;
    this.text= undefined;
  }

  render() { /*todo*/ }
}
CustomBlock._tokenType= TokenType.CustomBlock;


class Reference extends Token {
  constructor( text ) {
    super();
    const splitIdx= text.indexOf(']:');
    assert( text[0] === '[');
    assert( splitIdx > 0 );

    this.reference= text.substring(1, splitIdx).trim();
    this.resource= text.substring(splitIdx+2).trim();

    Kekpiler.the().addReference( this );
  }

  render() {}

  resourceName() {
    return this.resource;
  }

  referenceName() {
    return this.reference;
  }
}
Reference._tokenType= TokenType.Reference;



class HardDivision extends DivisionToken {}
HardDivision._tokenType= TokenType.HardDivision;

class SoftDivision extends DivisionToken {}
SoftDivision._tokenType= TokenType.SoftDivision;


const TokenMatchGroups= {
  block: CustomBlock,
  box: ContainerBox,
  code: Code,
  comm: null,
  enum: EnumerationItem,
  esc: EscapedText,
  hdiv: HardDivision,
  head: Header,
  icode: InlineCode,
  icode2: InlineCode,
  img: Image,
  item: ItemizedItem,
  link: Link,
  par: Paragraph,
  qoute: Quote,
  ref: Reference,
  sdiv: SoftDivision,
  style: StyledText,
  table: Table,
  tcell: TableCell,
  tdiv: TableRowDivision,
  text: TextToken,
  thead: TableHeaderDivision,
};

const DefaultStyle= {
  strikeThrough: new StrikeThroughStyle(),
  code: new CodeStyle(),
  emphasis: [
    new EmphasisedStyle(),
    new StrongStyle(),
    (new EmphasisedStyle()).addStyle( new StrongStyle() )
  ]
};

class Extension {
  init() {}
  async preTokenize() {}
  async locateResources() {}
  async preRender() {}
  async preStringify() {}
}

class Kekpiler {

  constructor() {
    this.extensions= [];
    this.extensionMap= new Map();
    this._reset();
  }

  use( ex ) {
    this.extensions.push( ex );
    const name= ex.init( this );
    if( name ) {
      if( this.extensionMap.has(name) ) {
        throw new Error(`An extension with the name '${name}' already exists`);
      }
      this.extensionMap.set( name, ex );
    }
    return this;
  }

  injectTokenClass(baseClass, newClass) {
    Token.injectClass(baseClass, newClass);
  }

  _reset() {
    this.document= null;
    this.domBuilder= null;
    this.resourceRequests= null;
    this.referenceRequests= null;
  }

  _setInstance( fn ) {
    Kekpiler._instance= this;
    const x= fn();
    Kekpiler._instance= null;
    return x;
  }

  _buildTree( text ) {
    this.document= new Document( text );
  }

  _dumpDocument() {
    const printer= new IndentPrinter();
    this.document.print( printer );
    return printer.string();
  }

  _renderDocument() {
    this.domBuilder= this.document.render();
  }

  _dumpDomBuilder() {
    const printer= new IndentPrinter();
    this.domBuilder.print( printer );
    return printer.string();
  }

  _stringifyToHtml( indentation ) {
    const printer= indentation ? new IndentPrinter() : new Printer();
    this.domBuilder.toHtmlString( printer );
    return printer.string();
  }

  static the() {
    assert(Kekpiler._instance, 'Call to compiler instance in invalid state');
    return Kekpiler._instance;
  }

  requestResource( r ) {
    if( !this.resourceRequests ) {
      this.resourceRequests= new Map();
    }

    const type= r.resourceType();
    let resMap= this.resourceRequests.get( type );
    if( !resMap ) {
      resMap= new Map();
      this.resourceRequests.set(type, resMap);
    }

    const name= r.resourceName();
    let resArr= resMap.get( name );
    if( !resArr ) {
      resArr= [];
      resMap.set(name, resArr);
    }

    resArr.push( r );
  }

  _ensureReferenceRequestObj( name ) {
    if( !this.referenceRequests ) {
      this.referenceRequests= new Map();
    }

    let obj= this.referenceRequests.get( name );
    if( !obj ) {
      obj= { reference: null, requests: [] };
      this.referenceRequests.set( name, obj );
    }

    return obj;
  }

  _updateReferenceRequest( req, obj ) {
    req.setResourceName( obj.reference.resourceName() );
    this.requestResource( req );
  }

  requestReference( r ) {
    const name= r.referenceName();
    const obj= this._ensureReferenceRequestObj( name );

    obj.requests.push( r );
    if( !obj.reference ) {
      return;
    }

    this._updateReferenceRequest( r, obj );
  }

  addReference( r ) {
    const name= r.referenceName();
    const obj= this._ensureReferenceRequestObj( name );

    obj.reference= r;
    obj.requests.forEach( req => {
      this._updateReferenceRequest( req, obj );
    });
  }

  async _resolveResources() {
    if( !this.resourceRequests ) {
      return;
    }

    for( const ex of this.extensions ) {
      await ex.locateResources( this.resourceRequests );
    }

    // Just use the resource/reference names as urls if none is set yet
    this.resourceRequests.forEach( resMap => {
      resMap.forEach( reqArr => {
        reqArr.forEach( req => {
          req.trySetResourceUrl( req.resourceName() );
        })
      })
    });

    if( this.referenceRequests ) {
      this.referenceRequests.forEach( obj => {
        obj.requests.forEach( req => {
          req.trySetResourceUrl( req.referenceName() );
        })
      });
    }
  }

  async _preTokenizeCalls() {
    for( const ex of this.extensions ) {
      await ex.preTokenize( this );
    }
  }

  async _preRenderCalls() {
    for( const ex of this.extensions ) {
      await ex.preRender( this );
    }
  }

  async _preStringifyCalls() {
    for( const ex of this.extensions ) {
      await ex.preStringify( this );
    }
  }

  async compile( markdown, indentation= false ) {
    this._setInstance(() => {
      this._reset();
    });

    await this._preTokenizeCalls();

    this._setInstance(() => {
      this._buildTree( markdown );
    });

    await this._resolveResources();

    await this._preRenderCalls();

    this._setInstance(() => {

      console.log( this._dumpDocument() );

      this._renderDocument();
      console.log('~~~~~~~~~~~~~~~~~~~~~~');
      console.log( this._dumpDomBuilder() );
    });

    await this._preStringifyCalls();

    return this._setInstance(() => {
      const html= this._stringifyToHtml( indentation );
      console.log('~~~~~~~~~~~~~~~~~~~~~~');
      console.log( html );

      return html;
    });
  }
}
Kekpiler._instance= null;

const StyleExports= {
  TextStyle,
  NoneStyle,
  MultiTextStyle,
  StrikeThroughStyle,
  StrongStyle,
  EmphasisedStyle,
  CodeStyle
};

const TokenExports= {
  Token,
  ResourceToken,
  DivisionToken,
  ParentToken,
  Paragraph,
  Quote,
  ContainerBox,
  Document,
  List,
  ListItemToken,
  ItemizedItem,
  EnumerationItem,
  TextToken,
  EscapedText,
  Header,
  Code,
  StyledText,
  InlineCode,
  Link,
  Table,
  TableRow,
  TableHeaderRow,
  TableCell,
  TableHeaderCell,
  TableHeaderDivision,
  TableRowDivision,
  Image,
  CustomBlock,
  Reference,
  HardDivision,
  SoftDivision,
  TokenType,
  TableColumnAlignment
};

export {
  assert,
  abstractMethod,
  Enum,
  ArrayIterator,
  Printer,
  IndentPrinter,
  HtmlBuilder,
  HtmlElementBuilder,
  HtmlTextBuilder,
  Tokenizer,
  IterationDecisionType,
  IterationDecision,
  Extension,
  Kekpiler,
  StyleExports as Style,
  TokenExports as Token
};
