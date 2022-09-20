import {
  Mixin, Token, HtmlTextBuilder, HtmlElementBuilder, KekpilerImpl, Extension,
  MessageSeverity
} from '../kekpiler.js';

const FigureMixin= Mixin(klass => class FigureMixin extends klass {
  constructor(...args) {
    super(...args);

    this.captionTextContent= null;
  }

  captionText() {
    return this.captionTextContent || '';
  }

  consumeNeighbours( it ) {
    const res= super.consumeNeighbours( it );
    if( res !== this ) {
      return res;
    }

    it.consumeFirstNonDivisionTokenIf( token => {
      if( token.is(Token.TokenType.CustomMetaBlock) && token instanceof Caption ) {
        this.captionTextContent= token.captionText();
        return true;
      }
    });

    return this;
  }

  renderContent() {
    return super.render();
  }

  render() {
    const figureElement= new HtmlElementBuilder('figure', this.renderContent());

    // Only add a caption element if text is available
    const captionText= this.captionText();
    if( captionText ) {
      figureElement.appendChild(
        new HtmlElementBuilder('figcaption',
          new HtmlTextBuilder( captionText )
        )
      );
    } else {
      const kek= KekpilerImpl.the();
      kek.addMessage(kek.config().missingFigureCaptionMessageLevel, this, 'Figure without caption found');
    }

    return figureElement;
  }

  printTextContent( p ) {
    super.printTextContent( p );
    p.print( this.captionText() );
  }
});

class Caption extends Token.CustomMetaBlock.extend() {
  constructor(...args) {
    super(...args);

    // Expect token to have text content
    if( !this.captionText() ) {
      const kek= KekpilerImpl.the();
      kek.addMessage(kek.config().emptyCaptionElementMessageLevel, this, 'Caption without any text content found');
    }
  }

  captionText() {
    return this.resourceName() || this.referenceName();
  }
}

export let ImageFigure;
export let CodeFigure;
export let TableFigure;

function injectClassesImpl() {
  ImageFigure= Token.Token.injectClass(
    class ImageFigure extends FigureMixin(Token.Image.extend()) {
      captionText() {
        return this.captionTextContent || this.text;
      }

      render() {
        const elem= super.render();
        elem.addCssClass('image');
        return elem;
      }
    }
  );

  CodeFigure= Token.Token.injectClass(
    class CodeFigure extends FigureMixin(Token.Code.extend()) {
      render() {
        const elem= super.render();
        elem.addCssClass('code');
        return elem;
      }
    }
  );

  TableFigure= Token.Token.injectClass(
    class TableFigure extends FigureMixin(Token.Table.extend()) {
      render() {
        const elem= super.render();
        elem.addCssClass('table');
        return elem;
      }
    }
  );
}

export class FigureExtension extends Extension {
  init( kek ) {
    kek.setConfigDefaults({
      missingFigureCaptionMessageLevel: MessageSeverity.Warning,
      emptyCaptionElementMessageLevel: MessageSeverity.Warning
    });

    kek.registerCustomBlockToken('caption', Caption);
    return 'Figure';
  }

  injectClasses() {
    injectClassesImpl();
  }
}
