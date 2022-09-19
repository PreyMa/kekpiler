import * as Kek from '../kekpiler.js';

const FigureMixin= Kek.Mixin(klass => class FigureMixin extends klass {
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
      if( token.is(Kek.Token.TokenType.CustomMetaBlock) && token instanceof Caption ) {
        this.captionTextContent= token.resourceName() || token.referenceName();
        return true;
      }
    });

    return this;
  }

  renderContent() {
    return super.render();
  }

  render() {
    const figureElement= new Kek.HtmlElementBuilder('figure', this.renderContent());

    // Only add a caption element if text is available
    const captionText= this.captionText();
    if( captionText ) {
      figureElement.appendChild(
        new Kek.HtmlElementBuilder('figcaption',
          new Kek.HtmlTextBuilder( captionText )
        )
      );
    } else {
      const kek= Kek.KekpilerImpl.the();
      kek.addMessage(kek.config().missingFigureCaptionMessageLevel, this, 'Figure without caption found');
    }

    return figureElement;
  }
});

class Caption extends Kek.Token.CustomMetaBlock.extend() {
  constructor(...args) {
    super(...args);

    // Expect token to have text content
    if( !this.resourceName() && !this.referenceName() ) {
      const kek= Kek.KekpilerImpl.the();
      kek.addMessage(kek.config().emptyCaptionElementMessageLevel, this, 'Caption without any text content found');
    }
  }
}

export let ImageFigure;
export let CodeFigure;
export let TableFigure;

function injectClassesImpl() {
  ImageFigure= Kek.Token.Token.injectClass(
    class ImageFigure extends FigureMixin(Kek.Token.Image.extend()) {
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

  CodeFigure= Kek.Token.Token.injectClass(
    class CodeFigure extends FigureMixin(Kek.Token.Code.extend()) {
      render() {
        const elem= super.render();
        elem.addCssClass('code');
        return elem;
      }
    }
  );

  TableFigure= Kek.Token.Token.injectClass(
    class TableFigure extends FigureMixin(Kek.Token.Table.extend()) {
      render() {
        const elem= super.render();
        elem.addCssClass('table');
        return elem;
      }
    }
  );
}

export class FigureExtension extends Kek.Extension {
  init( kek ) {
    kek.setConfigDefaults({
      missingFigureCaptionMessageLevel: Kek.MessageSeverity.Warning,
      emptyCaptionElementMessageLevel: Kek.MessageSeverity.Warning
    });

    kek.registerCustomBlockToken('caption', Caption);
    return 'Figure';
  }

  injectClasses() {
    injectClassesImpl();
  }
}
