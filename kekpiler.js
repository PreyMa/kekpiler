
// Kekpiler Markdown to HTML compiler written by PreyMa

/**
* Compound Regular Expression class
* Combines the source of multiple regular exprssion objects into a single large
* regular expression. The flags specified for the first part are copied to the final
* expression object.
* Very large regular exprssions need to be split into multiple lines to keep them
* at least somewhat readable, but JS regexp cannot be simply split as the new line
* character will be included as a character literal. Writing them as string constants
* makes them again hard to read and reduces help provided by the IDE/editor. This
* lets one write a regex as multiple smaller parts which are concatenated on startup
* like strings.
**/
class CompoundRegularExpression {
  constructor(...parts) {
    this.flags= '';
    this.regex= null;
    this.sections= parts;
  }

  _compileIfNecessary() {
    // No valid regex to compile / combine
    const firstSec= this.sections[0];
    if( !this.sections.length || !firstSec ) {
      return;
    }

    // Already compiled
    if( this.regex ) {
      return;
    }

    this.flags= firstSec.flags;

    // Copy constructor fast path
    if( this.sections.length === 1 ) {
      this.regex= new RegExp( firstSec );
      return;
    }

    const srcString= this.sections.reduce((src, reg) => src+ reg.source, '');
    this.regex= new RegExp(srcString, this.flags);
  }

  // Duplicates the compiled regex, does not transfer the sections the regex is made of
  copy() {
    // Even if this regex instance will be discarded in favor of the newly created instance,
    // one of the two needs to be compiled at some point. By compiling this one instead
    // of the new one, less compilations are necessary if this instance is copied multiple
    // times for single use instances
    this._compileIfNecessary();
    return new CompoundRegularExpression( this.regex );
  }

  exec( text ) {
    this._compileIfNecessary();
    return this.regex.exec( text );
  }

  forEachMatch( text, fn ) {
    const stateRegex= this.copy();
    let match;
    while((match= stateRegex.exec(text)) !== null) {
      if( fn( match ) === IterationDecision.Break ) {
        return;
      }
    }
  }

  append( regex ) {
    this.sections.push( regex );
    this.regex= null;
    return this;
  }

  insert(pos, regex) {
    if( pos < 0 ) {
      pos= this.sections.length +pos+ 1;
    }
    assert( pos >= 0 && pos < this.sections.length, `Index ${pos} (zero based) is out of range for compound regex`);

    this.sections.splice(pos, 0, regex);
    this.regex= null;
    return this;
  }
}

const taskItemRegex= /((?<checkbox>^[^\S\r\n]*\[[^\S\r\n]*(?<checked>[xX])?[^\S\r\n]*\])|(?<content1>[\s\S]+))(?<content2>[\s\S]+)?/gm;
const itemPrefixRegex= /[^\S\r\n]*([\*\+-]|(\d+\.))/gm;
const quotePrefixRegex= /^[^\S\r\n]*>/gm;

const documentRegex= new CompoundRegularExpression(
  /(?<comm><!--[\s\S]*?-->)|/gm,
  /(?<head>[^\S\r\n]*#+[^\S\r\n]+.+)|/,
  /(?<code>```(.+\r?\n)?([\s\S](?!```))*[\s\S](```)?)|/,
  /(?<box>:::(.+\r?\n)?([\s\S](?!:::))*[\s\S](:::)?)|/,
  /(?<img>!\[.*\]((\(.*\))|(\[.*\])))|/,
  /(?<block>@\[.+\]((\(.*\))|(\[.*\])))|/,
  /(?<ref>[^\S\r\n]*\[.+\]\:.+)|/,
  /(?<item>[^\S\r\n]*[\*\+-][^\S\r\n]((``(([\s\S]```+)|[\S\s](?!``|(\r?\n[^\S\r\n]*\r?\n)))*.``)|(`(?!`)(([\s\S]``+)|[\s\S](?!`|(\r?\n[^\S\r\n]*\r?\n)))*.`)|([\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|(\r?\n---)|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n\r?\n(?![^\S\r\n]+\S)))))*.)|/,
  /(?<enum>[^\S\r\n]*\d+\.[^\S\r\n]((``(([\s\S]```+)|[\S\s](?!``|(\r?\n[^\S\r\n]*\r?\n)))*.``)|(`(?!`)(([\s\S]``+)|[\s\S](?!`|(\r?\n[^\S\r\n]*\r?\n)))*.`)|([\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|(\r?\n---)|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n\r?\n(?![^\S\r\n]+\S)))))*.)|/,
  /(?<table>(\|[^\|\r\n]+)+\|?[^\S\r\n]*\r?\n[^\S\r\n]*(\|[^\S\r\n]*[:-]-+[:-][^\S\r\n]*)+\|?[^\S\r\n]*\r?\n([^\S\r\n]*(\|[^\|\r\n]+)+\|?[^\S\r\n]*\r?\n)*)|/,
  /(?<quote>[^\S\r\n]*>(?!\r?\n)((``(([\s\S]```+)|[\S\s](?!``|(\r?\n[^\S\r\n]*\r?\n)))*.``)|(`(?!`)(([\s\S]``+)|[\s\S](?!`|(\r?\n[^\S\r\n]*\r?\n)))*.`)|([\s\S](?!(\r?\n[^\S\r\n]*\r?\n)|(\r?\n[^\S\r\n]*>[^\S\r\n]*\r?\n(?![^\S\r\n]*>))|(\r?\n(```|:::|---))|([!@]\[.*\]((\(.*\))|(\[.*\]))))))*[\S\s](\r?\n[^\S\r\n]*>[^\S\r\n]*)*)|/,
  /(?<par>(?=\S)((``(([\s\S]```+)|[\S\s](?!``|(\r?\n[^\S\r\n]*\r?\n)))*.``)|(`(?!`)(([\s\S]``+)|[\s\S](?!`|(\r?\n[^\S\r\n]*\r?\n)))*.`)|([\s\S](?!(\r?\n[^\S\r\n]*\r?\n)|(\r?\n(```|:::|---))|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n[^\S\r\n]*([\*\+-]|(\d+\.))[^\S\r\n]))))*[\S\s])|/,
  /(?<hdiv>\r?\n[^\S\r\n]*\r?\n[^\S\r\n]*\r?\n\s*)|/,
  /(?<sdiv>\r?\n[^\S\r\n]*\r?\n[^\S\r\n]*)/
);

const containerBoxRegex= new CompoundRegularExpression(
  /(?<code>```(.+\r?\n)?([\s\S](?!```))*[\s\S](```)?)|/gm,
  /(?<item>[^\S\r\n]*[\*\+-][^\S\r\n]((```([\s\S](?!```))*[\S\s]``)|[\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|(\r?\n\r?\n(?![^\S\r\n]+\S))))*.)|/,
  /(?<enum>[^\S\r\n]*\d+\.[^\S\r\n]((```([\s\S](?!```))*[\S\s]``)|[\S\s](?!(\r?\n([\*\+-]|(\d+\.))[^\S\r\n])|(\r?\n\r?\n(?![^\S\r\n]+\S))))*.)|/,
  /(?<par>(?=\S)((``(([\s\S]```+)|[\S\s](?!``|(\r?\n[^\S\r\n]*\r?\n)))*.``)|(`(?!`)(([\s\S]``+)|[\s\S](?!`|(\r?\n[^\S\r\n]*\r?\n)))*.`)|([\s\S](?!(\r?\n[^\S\r\n]*\r?\n)|(\r?\n(```|:::))|([!@]\[.*\]((\(.*\))|(\[.*\])))|(\r?\n[^\S\r\n]*([\*\+-]|(\d+\.))[^\S\r\n]))))*[\S\s])|/,
  /(?<sdiv>\r?\n[^\S\r\n]*\r?\n[^\S\r\n]*)/
);

const paragraphRegex= new CompoundRegularExpression(
  /(?<esc>\\[`_~*\\\[\$])|/gm,
  /(?<icode2>``(([\s\S]```+)|[\S\s](?!``))*.``)|/,
  /(?<icode>`(?!`)(([\s\S]``+)|[\s\S](?!`))*.`)|/,
  /(?<link>\[.*\]((\(.*\))|(\[.*\])))|/,
  /(?<style>(?<s1>___|\*\*\*|__|\*\*|[_~\*])([\S\s](?!\k<s1>))*.\k<s1>)|/,
  /(?<text>([\s\S](?![`_~*\\\[\$]))*.)/
);

const tableRegex= new CompoundRegularExpression(
  /(?<thead>\|([^\S\r\n]*[:-]-+[:-][^\S\r\n]*\|)+[^\S\r\n]*\r?\n)|/gm,
  /(?<tdiv>\|?[^\S\r\n]*\r?\n)|/,
  /(?<tcell>\|((\\\|)|[^\|\r\n])+)/
);

// Throw an exception if the condition is not true. The message may be a function,
// only evaluated on error, for error messages that are expensive to print/stringify
function assert( cond, msg= 'Assertion failed' ) {
  if( !cond ) {
    msg= typeof msg === 'function' ? msg() : msg;
    throw new Error( msg );
  }
}

// Assert that always throws
function assertNotReached( msg= 'Assertion failed: This section may not be reached' ) {
  return assert( false, msg );
}

// Marks a method body as abstract and always throws
function abstractMethod() {
  throw Error('Abstract method');
}

// Call function for all classes in the prototype chain of a provided class
function forEachPrototype( klass, cb ) {
  assert(typeof klass === 'function', 'Argument error: Expected a function');

  while( klass ) {
    if( cb( klass ) === IterationDecision.Break ) {
      return IterationDecision.Break;
    }

    klass= Object.getPrototypeOf( klass );
  }
}

// Check whether a child class inherits from a base class, via a linear search up
// the prototype chain of the child class until the base class is found
function inheritsFrom(baseClass, childClass) {
  assert(
    typeof baseClass === 'function' && typeof childClass === 'function',
    'Cannot check inheritance relation of non-function objects'
  );

  const res= forEachPrototype( childClass, k => k === baseClass ? IterationDecision.Break : IterationDecision.Continue );
  return res === IterationDecision.Break;
}

// Returns the index of the greates value in a sorted array smaller than a provided value
function binaryLowerBound(arr, value, comparator= (v,t) => v-t ) {
  let m= 0;
  let n= arr.length;
  while( m < n ) {
    const k= Math.floor((n + m) / 2);
    const cmp= comparator(value, arr[k]);
    if( cmp > 0 ) {
      m= k+1;
    } else if( cmp === 0 ) {
      return k;
    } else {
      n= k;
    }
  }
  return m-1;
}

// Creates a Mixin class from a class factory function.
function Mixin( klassFactory ) {
	const protoKey= Symbol('mixinKey');

	function wrapper( superKlass ) {
    const mixKlass= klassFactory( superKlass );
    mixKlass.prototype[protoKey]= wrapper;
    return mixKlass;
  }

  Object.defineProperty(wrapper, Symbol.hasInstance, {
    value: function( obj ) {
      return obj[protoKey] === wrapper;
    }
  });

  return wrapper;
}

// Checks whether a character is whitespace
function charIsWhitespace( c ) {
  return ' \t\n\r\v'.indexOf(c) !== -1;
}

// Escape text as html by replacing certain characters with html identity sequences
// Based on https://stackoverflow.com/a/6234804
function escapeHtml( str, removeNL= false ) {
  const htmlRegex= removeNL ? /[&<>'"\r\n]/gm : /[&<>'"\r]/gm;
  const escapeTable= {
    '&': '&amp;',
    "'": '&#039;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;',
    '\r': '',
    '\n': ' '
  };

  return str.replaceAll( htmlRegex, char => escapeTable[char] );
}

/**
* Enum Item class
* Every item in an enum is represented by an intstance of an enum item
**/
class EnumItem {
  constructor(id, name, data= null) {
    if( typeof data === 'object' ) {
      Object.assign(this, data);
    }

    this._id= id;
    this._name= name;
  }

  ordinal() {
    return this._id;
  }

  name() {
    return this._name;
  }
}

/**
* Enum class
* This class is usually not instantiated directly. Instead objects consisting of
* key value pairs are (forcefully) turned into enums by setting their prototype.
* The values of the initialized object are replaced with enum items, that may store
* data. Enumerated names may not start with an underscore.
* This improves IDE support as the keys are known and text suggestions are better.
*/
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
    this._table= [];
    this._addKeys( obj );
  }

  __enumerate() {
    let counter= 0;
    this._count= 0;
    this._table= [];

    for(const key in this) {
      if( typeof key === 'string' && key[0] !== '_' ) {
        if( this[key] instanceof EnumItem ) {
          this[key]._id= counter++;
        } else {
          this[key]= new EnumItem(counter++, key, this[key]);
        }

        this._table.push( this[key] );
      }
    }

    this._count= counter;
  }

  // Add a single name as a new key and re-enumerate
  _addKey( keyName ) {
    this[keyName]= 0;
    this.__enumerate();
  }

  // Add all key-value-pairs of a provided object as keys and re-enumerate
  _addKeys( obj ) {
    Object.assign(this, obj);
    this.__enumerate();
  }

  // Get a single enumeration item by either name, id or identity (eg. to check whether
  // it is part of the enum)
  _getItem( key ) {
    if( key instanceof EnumItem ) {
      if( this._table.some( item => item === key ) ) {
        return key;
      }
    }

    if( typeof key === 'number' ) {
      if( key >= 0 && key < this._count ) {
        return this._table[key];
      }
    }

    if( typeof key === 'string' ) {
      if( key[0] !== '_' && this.hasOwnProperty(key) ) {
        return this[key];
      }
    }

    return null;
  }
}

/**
* Array Iterator class
* Iterates over an array similarly like a Java List iterator
**/
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

  peek(offset= 1) {
    return this.array[this.idx+ offset];
  }

  remainingItems() {
    return this.array.length- this.idx;
  }

  next(offset= 1) {
    this.idx+= offset;
    return this.get();
  }

  whileHasNext( fn ) {
    while( this.hasNext() ) {
      const value= this.next();
      const result= fn( value, this );
      if( result === IterationDecision.Break ) {
        return;
      }
    }
  }
}

/**
* Token Iterator class
* Adds some convenience methods specific to traversing lists of tokens
**/
class TokenIterator extends ArrayIterator {
  consumeFirstNonDivisionTokenIf( fn ) {
    for( let i= 1; i< this.remainingItems(); i++ ) {
      // Jump over all division tokens
      const token= this.peek( i );
      if( token.is(TokenType.SoftDivision) || token.is(TokenType.HardDivision) ) {
        continue;
      }

      // Stop if the token is consumed
      if( fn( token ) ) {
        return;
      }

      // Allow multiple meta blocks to be checked
      if( !token.is(TokenType.CustomMetaBlock) ) {
        return;
      }
    }
  }
}

/**
* Printer class
* Base class for text printers supporting automatic block indentation. This base
* class ignores indentation commandy and creates "minified" output.
**/
class Printer {
  constructor() {
    this.buffer= '';
  }

  _appendLine( text, brk= '\n' ) {
    this.buffer+= text+ brk;
  }

  // Push a new block level -> Adds an indentation level for indent printers
  push() {
    return this;
  }

  // Pop an active block level -> Removes an indentation level for indent printers
  pop() {
    return this;
  }

  // Print a line of values joined with space characters
  print( ...vals ) {
    this._appendLine( vals.join(' ') );
    return this;
  }

  // Automatically push a block level on entering the lombda and pop it when leaving
  printBlock( fn ) {
    this.push();
    fn();
    this.pop();
    return this;
  }

  // Disable any addiotn of whitespace like new lines and block level indentation
  // for the duration of the lambda. Works with recursive calls
  printNoBlock( fn ) {
    fn();
    return this;
  }

  // Return the accumulated string data
  string() {
    return this.buffer;
  }
}

/**
* Indente Printer class
* Extends the base printer with indentation. Each pushed block state indenets each
* appended line by the specified number of space characters.
**/
class IndentPrinter extends Printer {
  constructor( indent= 2 ) {
    super();
    this.level= 0;
    this.indent= indent;
    this.indentStr= '';
    this.doIndent= true;
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
    if( this.doIndent ) {
      this._appendLine( this.indentStr + vals.join(' ').split('\n').join( '\n'+ this.indentStr ) );
    } else {
      this._appendLine( vals.join(' '), '' );
    }

    return this;
  }

  printNoBlock( fn ) {
    // Save state before
    const savedLevel= this.level;
    const savedIndent= this.indent;
    const savedIndentStr= this.indentStr;
    const savedDoIndent= this.doIndent;

    // Print with disabled indentation from now on
    this.doIndent= false;
    fn();

    // Restore state
    this.level= savedLevel;
    this.indent= savedIndent;
    this.indentStr= savedIndentStr;
    this.doIndent= savedDoIndent;
    return this;
  }
}

/**
* Console Printer class
* Allows for the specification of a sink function, where printed text is piped to.
**/
class ConsolePrinter extends IndentPrinter {
  constructor( sink, indent ) {
    super( indent );

    this.sinkFunction= sink;
    this.buffer= undefined;
  }

  _appendLine( text ) {
    this.sinkFunction( text );
  }

  static the() {
    return ConsolePrinter._instance;
  }
}
ConsolePrinter._instance= new ConsolePrinter( text => console.log(text) );

const MessageSeverity= {
  Info: 0,
  Warning: 0,
  Error: 0
};
Enum.initPlainObject(MessageSeverity);

/**
* Positional Message class
* Stores a compiler generated message to the user. Used for linting, warning and
* error messages. Keeps additional information about the source location responsible
* and severity.
**/
class PositionalMessage {
  constructor(token, severity, message) {
    this.position= token.getSourceIndex();
    this.sourceSnippet= token.sourceSnippet(-15, 15);
    this.severityLevel= severity;
    this.message= message;

    const {line, column}= Kekpiler.the().calcLineColumnFromSourceIndex(this.position);
    this.lineNum= line;
    this.columnNum= column;
  }

  severity() {
    return severity;
  }

  print( p ) {
    p.print(`@${this.lineNum+1}:${this.columnNum+1} (...${this.sourceSnippet}...) ${this.severityLevel.name()}: ${this.message}`)
  }
}

/**
* Compilation Error class
* A positional message with error severity that stores a stack trace of when the
* error was created.
**/
class CompilationError extends PositionalMessage {
  constructor(token, message, error= null) {
    super(token, MessageSeverity.Error, message);
    this.trace= error instanceof Error ? error : Error('Compiling error stack trace');
  }
}

/**
* Severtiy Logger class
* A message logger configuration that stores the kekpiler instance, severity and
* token that can be passed around. Allows eg extensions to set their message severity
* on a logger and hand it off to other machinery that does not know about the kekpiler
* instance or the user configuration.
**/
class SeverityLogger {
  constructor( kek, severity, token ) {
    this.kekpiler= kek;
    this.severity= severity;
    this.token= token;
  }

  addMessage( message ) {
    this.kekpiler.addMessage( this.severity, this.token, message );
  }
}

/**
* Html Builder class
* Simple virtual DOM base class for html elements that can be converted into HTML
* markup code.
**/
class HtmlBuilder {
  // Serialize the dom node and its contents as html code text
  toHtmlString() {
    abstractMethod();
  }

  // Print the dom node and its contents for debug purposes
  print( p ) {
    abstractMethod();
  }

  // Find the first descendant node or self that has the specified tag name
  descendantWithTagname( name ) {
    abstractMethod();
  }

  // Wrap this builder instance with a decorator proxy object
  decorate( klass ) {
    return new klass( this );
  }

  // Check whether the element is of class type
  is( klass ) {
    return this instanceof klass;
  }
}

/**
* Html Single Element Builder class
* Virtual DOM element that does not have any children, eg <img/> tags.
* Stores its tag type, CSS classes and arbitrary attributes.
**/
class HtmlSingleElementBuilder extends HtmlBuilder {
  constructor( tagName ) {
    super();
    this.tagName= tagName;
    this.cssClasses= null;
    this.attributes= null;
  }

  addCssClass( name ) {
    if( !this.cssClasses ) {
      this.cssClasses= new Set();
    }

    this.cssClasses.add( name );
  }

  setAttribute( name, value= '', escapeAttr= true  ) {
    if( !this.attributes ) {
      this.attributes= new Map();
    }

    this.attributes.set(name, escapeAttr ? escapeHtml(value, true) : value);
  }

  _classesToHtmlString() {
    let classes= '';
    if( this.cssClasses ) {
      classes= ` class="${Array.from(this.cssClasses).join(' ')}"`;
    }
    return classes;
  }

  _attributesToHtmlString() {
    let attributes= '';
    if( this.attributes ) {
      this.attributes.forEach( (attr, key) => {
        attributes+= ` ${key}="${attr}"`;
      });
    }
    return attributes;
  }

  toHtmlString( p ) {
    const classes= this._classesToHtmlString();
    const attributes= this._attributesToHtmlString();
    p.print(`<${this.tagName}${classes}${attributes} />`);
  }

  _printBlock( p ) {}

  print( p ) {
    p.print(`<${this.tagName}>`);

    p.printBlock(() => {
      if( this.cssClasses ) {
        this.cssClasses.forEach( c => p.print('- class', c) );
      }
      if( this.attributes ) {
        this.attributes.forEach( (a, k) => p.print(`- attr ${k}:`, a) );
      }
      this._printBlock( p );
    });
  }

  descendantWithTagname( name ) {
    return this.tagName === name ? this : null;
  }
}

/**
* Html Builder Node List Mixin Class
* This class serves as an interface for html builder nodes that store other nodes
* as children eg. html tags with child elements or a collection of spans
**/
const HtmlBuilderNodeList= Mixin( klass => {
  return class HtmlBuilderNodeList extends klass {
    constructor(...args) {
      super(...args);
      this.children= [];
    }

    appendChild( c ) {
      if( c ) {
        if( Array.isArray(c) ) {
          this.children.push( ...c );
          return;
        }

        this.children.push(c);
      }
    }

    prependChild( c ) {
      if( c ) {
        if( Array.isArray(c) ) {
          this.children.unshift( ...c );
          return;
        }

        this.children.unshift( c );
      }
    }

    clearChildren() {
      const children= this.children;
      this.children= [];
      return children;
    }

    childNode( idx ) {
      return this.children[idx];
    }

    toHtmlString( p ) {
      this.children.forEach( c => c.toHtmlString( p ) );
    }

    _superToHtmlString() {
      super.toHtmlString( p );
    }

    print( p ) {
      this.children.forEach( c => c.print( p ) );
    }

    _superPrint( p ) {
      super.print( p );
    }

    descendantWithTagname( name ) {
      let child;
      this.children.some( c => child= c.descendantWithTagname(name) );
      return child;
    }
  };
});

/**
* Html Element Builder class
* Virtual DOM element that can store child elements.
**/
class HtmlElementBuilder extends HtmlBuilderNodeList(HtmlSingleElementBuilder) {
  constructor( tagName, ...children ) {
    super( tagName );
    this.children= children;
  }

  toHtmlString( p ) {
    const classes= this._classesToHtmlString();
    const attributes= this._attributesToHtmlString();

    p.print(`<${this.tagName}${classes}${attributes}>`).printBlock(() => {
      super.toHtmlString( p );
    }).print(`</${this.tagName}>`);
  }

  _printBlock( p ) {
    super.print( p );
  }

  print( p ) {
    super._superPrint( p );
  }

  descendantWithTagname( name ) {
    if( this.tagName === name ) {
      return this;
    }

    return super.descendantWithTagname( name );
  }
}

/**
* Html Text Builder class
* Virtual DOM representation of text node content.
**/
class HtmlTextBuilder extends HtmlBuilder {
  constructor( text, escapeText= true ) {
    super();

    this.text= escapeText ? escapeHtml(text) : text;
  }

  toHtmlString( p ) {
    p.print( this.text );
  }

  print( p ) {
    p.print( this.text );
  }

  descendantWithTagname( name ) {
    return null;
  }
}

/**
* Opaque Html Builder
* Virtual DOM representation of an opaque block of html code. Its text content and
* child nodes are just textual html code instead the of a tree of html builder nodes.
* This makes working with the contents harder, but is useful for code generated by
* other libraries that provide additional code generation capabilities like code
* highlighters or latex-math compilers.
**/
class OpaqueHtmlBuilder extends HtmlBuilder {
  constructor( html, name= 'opaque-html', whitespacePre= false ) {
    super();
    this.html= html;
    this.name= name;
    this.keepWhitespace= whitespacePre;
  }

  toHtmlString( p ) {
    if( !this.keepWhitespace ) {
      p.print( this.html );
      return;
    }

    p.printNoBlock(() => {
      p.print( this.html );
    });
  }

  print( p ) {
    p.print( `<${this.name}>` );
  }
}

/**
* Html Builder Decorator class
* This is the base class for html builder decorators changing the behaviour of
* a provided builder instance. By deafault all mehtod calls are transparently
* passed through.
**/
class HtmlBuilderDecorator {
  constructor( elem ) {
    this.element= elem;
  }

  toHtmlString(...args) {
    return this.element.toHtmlString(...args);
  }

  print(...args) {
    return this.element.print(...args);
  }

  descendantWithTagname(...args) {
    return this.element.descendantWithTagname(...args);
  }

  is(...args) {
    return this.element.is(...args);
  }

  wrappedElement() {
    if( this.element instanceof HtmlBuilderDecorator ) {
      return this.element.wrappedElement();
    }

    return this.element;
  }
}

/**
* Html Builder Pre Whitespace Decorator class
* Makes the element to stringify itself wihtout adding any whitespace, even
* during pretty printing.
**/
class HtmlBuilderPreWhitespace extends HtmlBuilderDecorator {
  toHtmlString( p ) {
    p.printNoBlock(() => super.toHtmlString( p ) );
  }
}

/**
* Tokenizer class
* Regex driver class splitting the markdown source text into matched sections
* categorized by their regex group name. Based on their group tokens are emitted.
**/
class Tokenizer {
  constructor() {
    this.documentRegex= documentRegex;
    this.containerBoxRegex= containerBoxRegex;
    this.paragraphRegex= paragraphRegex;
    this.tableRegex= tableRegex;
  }

  static _tokenize( text, regex, indexOffset ) {
    const tokens= [];
    regex.forEachMatch( text, match => {
      const token= Token.createFromMatch( match, indexOffset );
      if( !token ) {
        return;
      }

      tokens.push( token );
    });

    return tokens;
  }

  tokenizeDocument( text, indexOffset= 0 ) {
    return Tokenizer._tokenize( text, this.documentRegex, indexOffset );
  }

  tokenizeContainerBox( text, indexOffset= 0 ) {
    return Tokenizer._tokenize( text, this.containerBoxRegex, indexOffset );
  }

  tokenizeParagraph( text, indexOffset= 0 ) {
    return Tokenizer._tokenize( text, this.paragraphRegex, indexOffset );
  }

  tokenizeTable( text, indexOffset= 0 ) {
    return Tokenizer._tokenize( text, this.tableRegex, indexOffset );
  }

  _defineToken( groupName, klass ) {
    const klassName= klass.name;
    assert(inheritsFrom(Token, klass), `To define a token, a class needs to inherit from the Token base class. The class '${klassName}' does not inherit from 'Token'.`);
    assert(!TokenMatchGroups[groupName], `Token regex group name is already in use '${groupName}'`);
    assert(!TokenType[klassName], `Token klass name is already in use '${klassName}'`);

    TokenMatchGroups[groupName]= klass;
    TokenType._addKey(klassName);
    klass._tokenType= TokenType[klassName];
  }

  defineTextToken( name, klass, regex ) {
    this._defineToken( name, klass );

    this.containerBoxRegex.insert( -3, regex ); // Before <par>
    this.paragraphRegex.insert( -2, regex );    // Before <text>
  }

  defineDocumentToken( name, klass, regex ) {
    this._defineToken( name, klass );

    this.documentRegex.insert( -4, regex ); // Before <par>
  }
}

/**
* Text Style class
* Interface to transform a virtual dom text node to change its style. Usually the
* text node is wrapped by another dom node to change its appearance, eg <strong>...</strong>
**/
class TextStyle {
  render() {
    abstractMethod();
  }

  addStyle( otherStyle ) {
    return new MultiTextStyle(this, otherStyle);
  }
}

/**
* None Style class
* Helper class that does no transformation -> NOP
**/
class NoneStyle extends TextStyle {
  render( element ) {
    return element;
  }

  addStyle( otherStyle ) {
    return otherStyle;
  }
}

/**
* Multi Text Style class
* Decorator to combine two text styles by calling them recursively.
**/
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
* appropriate requests to the compiler. The base class 'klass' is expected to have
* a copy constructor, that takes an instance of itself.
*/
const ResourceToken= Mixin( klass => {
  return class ResourceToken extends klass {
    constructor( text, offset, ...args ) {
      // Copy construct
      if( text instanceof ResourceToken ) {
        super( text );
        return this._copyConstruct( text );
      }

      super(...args);

      this.text= null;
      this.resource= null;
      this.reference= null;
      this.resourceUrl= null;

      this._constructFromText( text, offset );
    }

    _copyConstruct( other ) {
      // Copy whole state
      this.text= other.text;
      this.resource= other.resource;
      this.reference= other.reference;
      this.resourceUrl= other.resourceUrl;

      this._setupRequestCallback();
    }

    _constructFromText( text, offset ) {
      const splitIdx= text.indexOf(']');
      assert( text[offset] === '[' );
      assert( splitIdx > 0 );

      this.text= text.substring(offset+1, splitIdx);

      // Either make a request or a reference request to the compiler
      const refOrResName= text.substring(splitIdx+2, text.length-1).trim();
      if( text[splitIdx+1] === '(' ) {
        this.resource= refOrResName;
      } else {
        this.reference= refOrResName;
      }

      this._setupRequestCallback();
    }

    _setupRequestCallback() {
      // Is already resolved or does not need a resource
      if( this.resourceUrl || this.resourceType === 'none') {
        return;
      }

      if( this.resource ) {
        Kekpiler.the().requestResource( this );
      } else {
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
});

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
  CustomMetaBlock: 0,
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

/**
* Token class
* Base class for all tokens used to represent the markdown source code as tree
* of token nodes. Nodes are created by the Tokenizer using regular expressions,
* they can then recursively tokenize their text content.
**/
class Token {
  /** @param{number|Token} sourceIndex **/
  constructor( sourceIndex ) {
    // Copy construct
    if( sourceIndex instanceof Token ) {
      this.sourceIndex= sourceIndex.sourceIndex;
      return;
    }

    this.sourceIndex= sourceIndex;
  }

  static createFromMatch( match, indexOffset ) {
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

    return TokenMatchGroups[key].create(match.index+ indexOffset, groups[key]);
  }

  static _resolveTokenClass( baseClass ) {
    if( !baseClass._injectedClass ) {
      return baseClass;
    }

    return baseClass._injectedClass;
  }

  static injectClass( newClass ) {
    // Find the most specific base class from the list of base token classes, by
    // walking up the prototype chain and looking for the first class that fits
    let baseClass= null;
    forEachPrototype( newClass, k => {
      if( ExportedBaseTokensArray.indexOf(k) >= 0 ) {
        baseClass= k;
        return IterationDecision.Break;
      }
    });

    assert(
      baseClass,
      `Injected class has to inherit from one of the base classes defined in the list `+
      `of exported token types. '${newClass.name}' does not inherit from any of them.`
    );

    const resolved= Token._resolveTokenClass(baseClass);
    assert(
      inheritsFrom(resolved, newClass),
      `Injected class has to inherit from its most recently injected version. `+
      `Make sure to inherit using '.extend()' eg: 'class MyToken extends Kek.Token.Header.extend() {}'. `+
      `'${newClass.name}' does not inherit from '${resolved.name}'.`
    );

    baseClass._injectedClass= newClass;
    return newClass;
  }

  static create(...args) {
    const klass= Token._resolveTokenClass( this );
    return new klass(...args);
  }

  static extend() {
    return Token._resolveTokenClass( this );
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

  isInlineToken() {
    abstractMethod();
  }

  getSourceIndex() {
    return this.sourceIndex;
  }

  sourceSnippet(offsetStart= 0, offsetEnd= 10) {
    return Kekpiler.the().source.substring(this.sourceIndex+ offsetStart, this.sourceIndex+ offsetEnd).replaceAll('\n', ' ').replaceAll('\r', '');
  }

  print( p ) {
    p.print( this.name(), `@${this.sourceIndex} (${this.sourceSnippet()})`);
  }

  consumeTokens( it ) {
    return this;
  }

  consumeNeighbours( it ) {
    return this;
  }

  render() {
    abstractMethod();
  }

  printTextContent( p ) {}
}

/**
* Division Token class
* These tokens are not rendered and are used to indicate section break, like paragraphs
* or line breaks in table rows.
**/
class DivisionToken extends Token {
  render() {}
  isInlineToken() {
    return false;
  }
}
DivisionToken._tokenType= TokenType.DivisionToken;

/**
* Parent Token class
* This is the base class for all tokens acting as tree nodes containing tokens as
* children. Handles the recursive tokenization and rendering.
**/
class ParentToken extends Token {
  constructor( idx ) {
    super( idx );
    this.children= [];
  }

  appendChild( ...c ) {
    this.children.push( ...c );
    return c[0];
  }

  hasChildren() {
    return !!this.children.length;
  }

  isInlineToken() {
    return false;
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

  printTextContent( p ) {
    this.children.forEach( c => c.printTextContent( p ) );
  }

  _createChildrenFromTokenList( tokens ) {
    const tokenIt= new ArrayIterator( tokens );

    const nodes= [];
    tokenIt.whileHasNext( node => {
      node= node.consumeTokens( tokenIt );

      if( node ) {
        nodes.push( node );
      }
    });

    const nodeIt= new TokenIterator( nodes );
    nodeIt.whileHasNext( node => {
      node= node.consumeNeighbours( nodeIt );
      this.children.push( node );
    });
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

/**
* Paragraph class
* Token for paragraphs of text. During parsing a paragraph can consume and gut
* following paragraphs until a non-inline-token is reached like a division token.
**/
class Paragraph extends ParentToken {
  constructor( idx, text ) {
    super( idx );

    if( text === null ) {
      return;
    }

    const tokens= Kekpiler.the().tokenizer().tokenizeParagraph( text, idx );
    this._createChildrenFromTokenList( tokens );
  }

  consumeNeighbours( it ) {
    while( it.hasNext() ) {
      const token= it.peek();
      // Consume inline tokens
      if( token.isInlineToken() ) {
        this.appendChild( it.next() );

      // Consume all children of a following paragraph which is not seperated
      // by a division
      } else if( token.is(TokenType.Paragraph) ) {
        this.appendChild( ...it.next().children );

      } else {
        break;
      }
    }

    return this;
  }

  _htmlElementTag() {
    return 'p';
  }
}
Paragraph._tokenType= TokenType.Paragraph;

class Quote extends ParentToken {
  constructor( idx, text ) {
    super( idx );

    const content= text.replace(new RegExp(quotePrefixRegex), '');

    // FIXME: This is a hack to average out the index error created by removing
    // the quote prefix.
    const contentIndex= idx+ Math.floor((text.length - content.length) / 2);
    const tokens= Kekpiler.the().tokenizer().tokenizeContainerBox( content, contentIndex );
    this._createChildrenFromTokenList( tokens );
  }

  _htmlElementTag() {
    return 'blockquote';
  }
}
Quote._tokenType= TokenType.Quote;

class ContainerBox extends ParentToken {
  constructor( idx, text ) {
    super( idx );
    assert( text[2] === ':' );

    const endOfLine= text.indexOf('\n')+ 1;
    this.containerType= text.substring(3, endOfLine).trim();

    const content= text.substring(endOfLine, text.length- 3)
    const tokens= Kekpiler.the().tokenizer().tokenizeContainerBox( content, idx+ endOfLine );
    this._createChildrenFromTokenList( tokens );
  }

  _htmlElementTag() {
    return 'div';
  }

  render() {
    const elem= super.render();
    if( this.containerType ) {
      elem.addCssClass( Kekpiler.the().config().userContentPrefix+ this.containerType );
    }

    return elem;
  }
}
ContainerBox._tokenType= TokenType.ContainerBox;


class Document extends ParentToken {
  constructor( text ) {
    super( 0 );

    const tokens= Kekpiler.the().tokenizer().tokenizeDocument( text );
    this._createChildrenFromTokenList( tokens );
  }

  _htmlElementTag() {
    return 'article';
  }
}
Document._tokenType= TokenType.Document;

class List extends ParentToken {
  constructor( idx, tokens, useParagraph= false ) {
    super( idx );
    this.children= tokens;

    this.paragraphMode= useParagraph;
    this.children.forEach( c => c.hoistParagraphContent= !useParagraph );
  }

  _printSelf( p ) {
    p.print('List', this.paragraphMode ? '-PAR-' : '', `@${this.sourceIndex} (${this.sourceSnippet()})`);
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
  constructor( idx, text ) {
    super( idx );

    this.hoistParagraphContent= false;

    // Count whitespace to remove
    let wsLength= 0;
    while( charIsWhitespace(text[wsLength]) ) {
      wsLength++;
    }

    // Remove leading whitespace from every line
    const wsRegex= (new RegExp(`\\r?\\n[^\\S\\r\\n]{0,${wsLength+2}}`, 'gm'));
    let prefixLength= (new RegExp(itemPrefixRegex)).exec( text )[0].length;
    let content= text.substring( prefixLength ).replace( wsRegex, '\n' );

    // Detect and remove task list marker
    const taskGroups= (new RegExp(taskItemRegex)).exec( content ).groups;
    content= taskGroups.content1 || taskGroups.content2 || '';
    prefixLength += (taskGroups.checkbox || '').length;
    this.isTaskItem= !!taskGroups.checkbox;
    this.isChecked= !!taskGroups.checked;

    // FIXME: This is a hack to average out the index error created by removing
    // the whitespace before each line.
    const contentIndex= idx+ prefixLength+ Math.floor((text.length -prefixLength -content.length) / 2);
    const tokens= Kekpiler.the().tokenizer().tokenizeContainerBox( content, contentIndex );
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
    return List.create( this.sourceIndex, tokens, useParagraph );
  }

  _htmlElementTag() {
    return 'li';
  }

  _renderChildren( element ) {
    if( !this.children.length ) {
      return;
    }

    // Prepend checkbox element and set task item class
    if( this.isTaskItem ) {
      const checkbox= new HtmlSingleElementBuilder('input');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('disabled');
      if( this.isChecked ) {
        checkbox.setAttribute('checked');
      }

      element.appendChild( checkbox );

      const cssClass= Kekpiler.the().config().taskItemCssClassName;
      if( cssClass ) {
        element.addCssClass( cssClass );
      }
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
    p.print(`-Item @${this.sourceIndex} (${this.sourceSnippet()})`);
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
  /** @param{number|TextToken} idx **/
  constructor( idx, text= null ) {
    super( idx );

    if( idx instanceof TextToken ) {
      this.text= idx.text;
      return;
    }

    this.text= text;
  }

  isInlineToken() {
    return true;
  }

  print( p ) {
    p.print(`"${this.text}"`);
  }

  render( p ) {
    return new HtmlTextBuilder( this.text );
  }

  printTextContent( p ) {
    p.print( this.text );
  }
}
TextToken._tokenType= TokenType.Text;


class EscapedText extends TextToken {
  constructor( idx, text ) {
    // Remove the back slash
    super( idx, text[1] );
  }
}
EscapedText._tokenType= TokenType.EscapedText;


class Header extends TextToken {
  constructor( idx, text ) {
    super( idx );
    text= text.trim();

    let cnt= 0;
    while( text[cnt] === '#' ) {
      cnt++;
    }

    this.level= Math.max(1, cnt);
    this.text= text.substring(cnt+ 1);
  }

  headerLevel() {
    return this.level;
  }

  print( p ) {
    p.print('#'.repeat(this.level), this.text);
  }

  render() {
    const level= this.level+ Kekpiler.the().config().headingLevelOffset;
    return new HtmlElementBuilder('h'+ level, new HtmlTextBuilder(this.text));
  }
}
Header._tokenType= TokenType.Header;


class Code extends TextToken {
  constructor( idx, text ) {
    super( idx );
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
    return (new HtmlElementBuilder('pre',
              new HtmlElementBuilder('code',
                new HtmlTextBuilder( this.text )
              )
            )).decorate( HtmlBuilderPreWhitespace );
  }

  printTextContent( p ) {
    if( Kekpiler.the().config().dumpCodeblocksAsTextContent ) {
      super.printTextContent( p );
    }
  }
}
Code._tokenType= TokenType.Code;


class StyledText extends TextToken {
  constructor( idx, text ) {
    super( idx );

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
  constructor( idx, text ) {
    const off= ( text[1] === '`' && text[text.length-2] === '`') ? 2 : 1;
    super( idx, text.substring( off, text.length- off).trim() );
  }

  render() {
    return DefaultStyle.code.render( super.render() );
  }
}

class Link extends ResourceToken(TextToken) {
  constructor( idx, text ) {
    super( text, 0, idx );
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
  constructor( idx, text ) {
    super( idx );
    this.fallBackText= text;

    const tokens= Kekpiler.the().tokenizer().tokenizeTable( text, idx );
    const it= new ArrayIterator( tokens );

    if( !it.hasNext() ) {
      return;
    }

    // Make the header row the first child by default
    const header= TableHeaderRow.create(idx);
    this.appendChild( header );

    // Get all cells that make up the header until the header div is reached
    while( it.hasNext() ) {
      const tk= it.next();
      if( tk.is(TokenType.TableCell) ) {
        header.appendChild( tk );

      } else if( tk.is(TokenType.TableRowDivision) ) {
        break;

      } else {
        // console.log('UNEXPECTED HEADER CHILD', tk);
        this.children= [];
        return;
      }
    }

    if( !it.hasNext() || !it.next().is(TokenType.TableHeaderDivision) ) {
      // console.log('EXPECTED LAYOUT', it.get());
      this.children= [];
      return;
    }

    const tableLayout= it.get();

    // Layout and header row need to have the same number of columns
    const columnCount= tableLayout.columnCount();
    if( columnCount !== header.children.length ) {
      // console.log('LAYOUT COLS DON\'T MATCH', columnCount, header.children.length);
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
          // console.log('UNEXPECTED CELL CHILD', tk);
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
  constructor( idx, columnCount= -1 ) {
    super( idx );
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
  constructor( idx, text ) {
    // (Shallow) copy construct
    if( idx instanceof TableCell ) {
      super( idx.sourceIndex, null );
      Object.assign(this, idx);
      return;
    }

    // Init internal paragraph with text (without the pipe symbol)
    super( idx, text.substring(1) );
    this.alignment= TableColumnAlignment.Left;
  }

  _htmlElementTag() {
    return 'td';
  }

  toHeaderCell() {
    return TableHeaderCell.create( this );
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
  constructor( idx, text ) {
    super( idx );
    this.text= text.trim();

    assert( this.text[0] === '|' );
    assert( this.text[this.text.length-1] === '|' );

    // Manually break up the row into cells
    let srcIdx= idx;
    this.columns= [];
    this.text.substring(1, this.text.length-1).split('|').forEach( col => {
      const colLength= col.length;
      col= col.trim();

      // Use left alignment as the default
      let alignment= TableColumnAlignment.Left;
      if( col[col.length-1] === ':' ) {
        alignment= col[0] === ':' ? TableColumnAlignment.Center : TableColumnAlignment.Right;
      }

      this.columns.push({
        text: col,
        idx: srcIdx,
        alignment
      });

      srcIdx+= colLength+ 1;
    });
  }

  toTableRow() {
    const row= new TableRow();
    this.columns.forEach( c => row.appendChild(TableCell.create(c.idx, c.text)) );
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
  constructor( idx, text ) {
    super( text, 1, idx );
    assert( text[0] === '!' );

    if( !this.text.trim() ) {
      const level= MessageSeverity._getItem( Kekpiler.the().config().imageWithoutAltTextMessageLevel );
      Kekpiler.the().addMessage(level, this, 'Image is missing alt text');
    }
  }

  resourceType() {
    return 'image';
  }

  isInlineToken() {
    return false;
  }

  render() {
    const elem= new HtmlSingleElementBuilder('img');
    elem.setAttribute('src', this.resourceUrl);
    elem.setAttribute('alt', this.text);

    return elem;
  }
}
Image._tokenType= TokenType.Image;


class CustomBlock extends ResourceToken(Token) {
  constructor( idx, text ) {
    if( idx instanceof CustomBlock ) {
      super( idx, 1 );
    } else {
      super( text, 1, idx );
    }

    // Rename the inner text to better reflect its purpose
    this.blockType= this.text;

    // Do not remove the text property, because it is needed for copy construction
    // when creating a specialzed block token
    if( this._isSpecialized() ) {
      this.text= undefined;
    }
  }

  _isSpecialized() {
    return this.constructor !== CustomBlock;
  }

  _setupRequestCallback() {
    // Do not setup a callback for a plain custom block
    // A specialized custom block sets up its own callback (after copy construction)
    if( this._isSpecialized() ) {
      super._setupRequestCallback();
    }
  }

  consumeTokens( it ) {
    // Create a specialized custom block via copy construction.
    // Resource request callbacks will now be setup
    const token= Kekpiler.the().createCustomBlockToken(this.blockType, this);
    return token ? token : this;
  }

  isInlineToken() {
    return false;
  }

  render() {
    return new HtmlTextBuilder(`[${this.blockType}]`);
  }
}
CustomBlock._tokenType= TokenType.CustomBlock;

class CustomMetaBlock extends CustomBlock {
  resourceType() {
    return 'none';
  }

  print( p ) {
    p.print( this.name(), `@${this.sourceIndex} "${this.referenceName()}"`);
  }

  render() { /* NOP */ }
}
CustomMetaBlock._tokenType= TokenType.CustomMetaBlock;

class Reference extends Token {
  constructor( idx, text ) {
    super( idx );
    const splitIdx= text.indexOf(']:');
    assert( text[0] === '[');
    assert( splitIdx > 0 );

    this.reference= text.substring(1, splitIdx).trim();
    this.resource= text.substring(splitIdx+2).trim();

    Kekpiler.the().addReference( this );
  }

  isInlineToken() {
    return false;
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
  quote: Quote,
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

/**
* Extension base class
* Every extension has to inherit from this class. It stubbs out all callback
* hook methods, to make extensions more concise.
**/
class Extension {
  // Called before each compilation
  /** @return {string} Name of the extension
      @param {Kekpiler} comp Kekpiler instance **/
  init( comp ) {}

  // Called once after init for each instance of the module
  // Inject token classes into the inheritance hierarchy here
  injectClasses() {}

  // Called before any tokenization happens
  // Do any textual preprocessing here
  /** @param {Kekpiler} comp Kekpiler instance
      @param {string} markdown Mardown source code
      @returns {Promise<string>} Preprocessed markdown source code **/
  async preTokenize( comp, markdown ) {}

  // Called after token tree completed, and before rendering to html
  // Might not be called if no resource requests are pending
  /** @param {Kekpiler} comp Kekpiler instance
      @param {Map<string, Map<string, ResourceToken[]>>} resourceRequests Resources requested in the markdown **/
  async locateResources( comp, resourceRequests ) {}

  // Called before rendering to a virtual DOM
  /** @param {Kekpiler} comp Kekpiler instance **/
  async preRender( comp ) {}

  // Called before the rendered DOM is stringified into html code
  /** @param {Kekpiler} comp Kekpiler instance **/
  async preStringify( comp ) {}
}

class Kekpiler {
  constructor( userConfig ) {
    this.userConfig= userConfig;

    this.setConfigDefaults({
      userContentPrefix: 'md_',
      headingLevelOffset: 0,
      imageWithoutAltTextMessageLevel: MessageSeverity.Warning,
      debugPrinting: false,
      dumpCodeblocksAsTextContent: false,
      taskItemCssClassName: 'task-item'
    });

    /** @type{Extension[]} **/
    this.extensions= [];
    /** @type{Map<string, Extension>} **/
    this.extensionMap= new Map();
    /** @type{Map<string, typeof Extension>} **/
    this.customBlocks= new Map();
    this.tokenizerInstance= new Tokenizer();
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

  registerCustomBlockToken(name, klass) {
    if( !inheritsFrom(CustomBlock, klass) ) {
      throw new Error(`The class provided for custom block '${name}' has to inherit from the 'CustomBlock' class.`);
    }

    if( this.customBlocks.has(name) ) {
      throw new Error(`A custom block named '${name}' already exists`);
    }

    this.customBlocks.set(name, klass);
  }

  createCustomBlockToken( name, ...args ) {
    const klass= this.customBlocks.get(name);
    if( !klass ) {
      return null;
    }

    return klass.create(...args);
  }

  _reset() {
    this.source= null;
    this.lineTable= null;
    this.document= null;
    this.domBuilder= null;
    this.resourceRequests= null;
    this.referenceRequests= null;
    this.messages= [];
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

  _debug( func= null ) {
    if( !this.userConfig.debugPrinting ) {
      return false;
    }

    if( func ) {
      func();
    }

    return true;
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

  _dumpTextContent() {
    assert( this.document, 'There is no compiled document to extract text from');
    const printer= new Printer();
    this.document.printTextContent( printer );
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

  config() {
    return this.userConfig;
  }

  setConfigDefaults( defaultsObj ) {
    return this.userConfig= Object.assign(defaultsObj, this.userConfig);
  }

  tokenizer() {
    return this.tokenizerInstance;
  }

  calcLineColumnFromSourceIndex( idx ) {
    if( !this.lineTable ) {
      this.lineTable= [ 0 ];

      // Store the start index of each line in the array
      const lineRegex= /\r?\n/gm;
      let match= null;
      while((match= lineRegex.exec(this.source)) !== null) {
        this.lineTable.push( match.index+ 1 );
      }
    }

    const line= binaryLowerBound(this.lineTable, idx);
    const column= line >= 0 ? idx - this.lineTable[line] : -1;
    return {line, column};
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

  /**
  * Convert a reference request to a resource request based on the resolved
  * reference request data
  * @param req {ResourceToken} Request to upgrade
  * @param obj The resolved reference request data
  **/
  _upgradeReferenceRequest( req, obj ) {
    // Set the resource name stored in th reference and make a resource request
    req.setResourceName( obj.reference.resourceName() );
    this.requestResource( req );
  }

  requestReference( r ) {
    const name= r.referenceName();
    const obj= this._ensureReferenceRequestObj( name );

    obj.requests.push( r );

    // Upgrade to resource request if a reference token has been found
    if( obj.reference ) {
      this._upgradeReferenceRequest( r, obj );
    }
  }

  addReference( r ) {
    const name= r.referenceName();
    const obj= this._ensureReferenceRequestObj( name );

    // Upgrade all pending reference requests
    obj.reference= r;
    obj.requests.forEach( req => {
      this._upgradeReferenceRequest( req, obj );
    });
  }

  _setReferenceRequestsToDefaultValue() {
    if( this.referenceRequests ) {
      // All reference request that were never upraded to be resource requests
      this.referenceRequests.forEach( obj => {
        obj.requests.forEach( req => {
          req.trySetResourceUrl( req.referenceName() );
        })
      });
    }
  }

  async _resolveResources() {
    if( !this.resourceRequests ) {
      // Although there are no resource requests, there might still be referece
      // requests, that will be unresolveable in this case -> Just default set them
      this._setReferenceRequestsToDefaultValue();
      return;
    }

    for( const ex of this.extensions ) {
      await ex.locateResources( this, this.resourceRequests );
    }

    // Just use the resource/reference names as urls if none is set yet
    this.resourceRequests.forEach( resMap => {
      resMap.forEach( reqArr => {
        reqArr.forEach( req => {
          req.trySetResourceUrl( req.resourceName() );
        })
      })
    });

    this._setReferenceRequestsToDefaultValue();
  }

  addMessage( severity, token, text, error= null) {
    const msg= (severity === MessageSeverity.Error) ?
      new CompilationError( token, text, error ) :
      new PositionalMessage( token, severity, text );

    this.messages.push( msg );

    if( severity === MessageSeverity.Error ) {
      throw msg;
    }

    return msg;
  }

  addInfoMessage( token, text ) {
    this.addMessage( MessageSeverity.Info, token, text );
  }

  addWarningMessage( token, text ) {
    this.addMessage( MessageSeverity.Warning, token, text );
  }

  addErrorMessage( token, text ) {
    this.addMessage( MessageSeverity.Error, token, text );
  }

  severityLogger( severity, token ) {
    return new SeverityLogger( this, severity, token );
  }

  _injectExtensionClassesCalls() {
    if( Kekpiler._didInjectClasses ) {
      return;
    }

    for( const ex of this.extensions ) {
      ex.injectClasses();
    }

    Kekpiler._didInjectClasses= true;
  }

  async _preTokenizeCalls( markdown ) {
    for( const ex of this.extensions ) {
      const res= await ex.preTokenize( this, markdown );
      if( typeof res === 'string' ) {
        markdown= res;
      }
    }

    return markdown;
  }

  printMessages( p ) {
    this.messages.forEach( m => m.print(p) );
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

    this._injectExtensionClassesCalls();

    markdown= await this._preTokenizeCalls( markdown );

    this._setInstance(() => {
      this.source= markdown;
      this._buildTree( markdown );
    });

    await this._resolveResources();

    await this._preRenderCalls();

    this._setInstance(() => {
      this._debug(() => console.log( this._dumpDocument() ) );

      this._renderDocument();
      this._debug(() => console.log('~~~~~~~~~~~~~~~~~~~~~~\n', this._dumpDomBuilder()) );
    });

    await this._preStringifyCalls();

    return this._setInstance(() => {
      const html= this._stringifyToHtml( indentation );
      this._debug(() => console.log('~~~~~~~~~~~~~~~~~~~~~~\n', html ) );

      return html;
    });
  }

  extractTextContent() {
    return this._setInstance(() => {
      return this._dumpTextContent();
    });
  }
}
/** @type {Kekpiler} **/
Kekpiler._instance= null;
Kekpiler._didInjectClasses= false;

class KekpilerProxy {
  constructor(...args) {
    this.kekpiler= new Kekpiler(...args);
  }

  use(...args) {
    return this.kekpiler.use(...args);
  }

  config(...args) {
    return this.kekpiler.config(...args);
  }

  setConfigDefaults(...args) {
    return this.kekpiler.setConfigDefaults(...args);
  }

  registerCustomBlockToken(...args) {
    return this.kekpiler.registerCustomBlockToken(...args);
  }

  compile(...args) {
    return this.kekpiler.compile(...args);
  }

  extractTextContent(...args) {
    return this.kekpiler.extractTextContent(...args);
  }

  printMessages(...args) {
    return this.kekpiler.printMessages(...args);
  }
}

const StyleExports= {
  CodeStyle,
  EmphasisedStyle,
  MultiTextStyle,
  NoneStyle,
  StrikeThroughStyle,
  StrongStyle,
  TextStyle,
};

const TokenExports= {
  Code,
  ContainerBox,
  CustomBlock,
  CustomMetaBlock,
  DivisionToken,
  Document,
  EnumerationItem,
  EscapedText,
  HardDivision,
  Header,
  Image,
  InlineCode,
  ItemizedItem,
  Link,
  List,
  ListItemToken,
  Paragraph,
  ParentToken,
  Quote,
  Reference,
  ResourceToken,
  SoftDivision,
  StyledText,
  Table,
  TableCell,
  TableColumnAlignment,
  TableHeaderCell,
  TableHeaderDivision,
  TableHeaderRow,
  TableRow,
  TableRowDivision,
  TextToken,
  Token,
  TokenType,
};

const ExportedBaseTokensArray= Object.values(TokenExports).filter( k => typeof k === 'function' && inheritsFrom(Token, k) );

export {
  assert,
  assertNotReached,
  abstractMethod,
  escapeHtml,
  ArrayIterator,
  CompilationError,
  CompoundRegularExpression,
  ConsolePrinter,
  Enum,
  Extension,
  HtmlBuilder,
  HtmlBuilderDecorator,
  HtmlBuilderNodeList,
  HtmlBuilderPreWhitespace,
  HtmlElementBuilder,
  HtmlSingleElementBuilder,
  HtmlTextBuilder,
  IndentPrinter,
  IterationDecision,
  IterationDecisionType,
  MessageSeverity,
  Mixin,
  OpaqueHtmlBuilder,
  PositionalMessage,
  Printer,
  SeverityLogger,
  Tokenizer,
  Kekpiler as KekpilerImpl,
  KekpilerProxy as Kekpiler,
  StyleExports as Style,
  TokenExports as Token
};
