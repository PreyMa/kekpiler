import {
  Token, Extension, KekpilerImpl, HtmlElementBuilder, HtmlTextBuilder
} from '../kekpiler.js';
import {FragmentToken} from './fragments.js';

class SimpleSlugger {
  constructor(prefix= '') {
    this.prefix= prefix;
    this.reset();
  }

  reset() {
    this.set= new Set();
    this.counter= 0;
  }

  sluggify( text ) {
    text= this.prefix+ text.trim().toLowerCase().replace(/[^A-Za-z0-9_]+/gm, '_');
    if( this.set.has(text) ) {
      return text+ '_'+ this.counter++;
    }

    this.set.add( text );
    return text;
  }
}


let SluggedHeader;
function injectClassesImpl() {
  SluggedHeader= Token.Token.injectClass(
    class SluggedHeader extends FragmentToken(Token.Header.extend()) {
      constructor(...args) {
        super(...args);

        this.slug= null;
      }

      createSlug( slugger ) {
        this.slug= slugger.sluggify( this.text );
      }

      fragmentId() {
        return this.slug;
      }

      title() {
        return this.text;
      }

      _unwrapString( arg ) {
        if( typeof arg === 'string' ) {
          return arg;
        }

        if( typeof arg === 'function' ) {
          return arg( this );
        }

        return '';
      }

      render() {
        const elem= super.render();
        const link= KekpilerImpl.the().config().sluggedHeaderLink;
        if( link ) {
          const anchor= new HtmlElementBuilder('a',
            new HtmlTextBuilder( this._unwrapString( link.text ) )
          );

          anchor.setAttribute('href', this._unwrapString( link.href ) );
          elem.prependChild( anchor );
        }
        return elem;
      }
    }
  );
}

export class HeaderSluggerExtension extends Extension {
  constructor() {
    super();
    this.slugger= null;
  }

  init( kek ) {
    kek.setConfigDefaults({
      sluggedHeaderLink: {
        text: '📎',
        href: token => '#'+ token.fragmentId()
      }
    });
    this.slugger= new SimpleSlugger( kek.config().userContentPrefix );
    return 'HeaderSlugger';
  }

  injectClasses() {
    injectClassesImpl();
  }

  preTokenize() {
    this.slugger.reset();
  }

  preRender( kek ) {
    kek.document.forEachOfType(SluggedHeader, h => {
      h.createSlug( this.slugger );
    });
  }
}
