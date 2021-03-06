import * as Kek from '../kekpiler.js';
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
  SluggedHeader= Kek.Token.Token.injectClass(
    class SluggedHeader extends FragmentToken(Kek.Token.Header.extend()) {
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
    }
  );
}

export class HeaderSluggerExtension extends Kek.Extension {
  constructor() {
    super();
    this.slugger= null;
  }

  init( kek ) {
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
