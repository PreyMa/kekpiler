import * as Kek from '../kekpiler.js';
import {FragmentToken} from './fragments.js';

class TableOfContents extends Kek.Token.CustomBlock {
  constructor( text ) {
    super( text );

    this.table= null;
  }

  setTable( t ) {
    this.table= t;
  }

  render() {
    const children= this.table.map( tk => {
      const linkElem= new Kek.HtmlElementBuilder('a', new Kek.HtmlTextBuilder(tk.title()));
      linkElem.setAttribute('href', `#${tk.fragmentId()}`);
      return new Kek.HtmlElementBuilder('li', linkElem);
    });

    return  new Kek.HtmlElementBuilder('p',
              new Kek.HtmlElementBuilder('ol', ...children ));
  }
}

export class TableOfContentsExtension extends Kek.Extension {
  constructor() {
    super();

    this.table= null;
  }

  init( kek ) {
    kek.registerCustomBlockToken('TOC', TableOfContents);
    return 'tableOfContents';
  }

  preTokenize() {
    this.table= [];
  }

  preRender( kek ) {
    kek.document.forEachOfType(FragmentToken, tk => {
      if( tk.title() ) {
        this.table.push( tk );
      }
    });

    kek.document.forEachOfType(TableOfContents, tk => {
      tk.setTable( this.table );
    });
  }
}
