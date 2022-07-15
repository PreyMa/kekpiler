import * as Kek from '../kekpiler.js';


const mathRegex= /(?<math>(?<!\\)\$([\s\S](?<![^\\]\$))+(?<!\\)\$)|/;

class HtmlMathMlBuilder extends Kek.HtmlBuilder {
  constructor( mathml ) {
    super();

    this.mathml= mathml;
  }

  toHtmlString( p ) {
    p.print( this.mathml );
  }

  print( p ) {
    p.print('<math>');
  }
}

class MathToken extends Kek.Token.Token {
  constructor( pos, text ) {
    super( pos );
    this.mathMlString= null;

    Kek.assert(text[0] === '$' && text[text.length-1] === '$', 'Expected math formular to start with $');
    this.text= text.substring(1, text.length-1);
  }

  isInlineToken() {
    return true;
  }

  temmlCompile( temml ) {
    this.mathMlString= temml.renderToString( this.text );
  }

  render() {
    return new HtmlMathMlBuilder( this.mathMlString );
  }
}

export class TemmlMathExtension extends Kek.Extension {
  constructor( temml ) {
    super();

    Kek.assert(temml, 'Argument error: Missing Temml library');
    this.temml= temml;
  }

  init( kek ) {
    kek.tokenizer().defineTextToken('math', MathToken, mathRegex);
    return 'TemmlMath';
  }

  preRender( kek ) {
    // Compile all math tokens to MathML using Temml
    kek.document.forEachOfType(MathToken, tk => {
      tk.temmlCompile(this.temml);
    });
  }
}
