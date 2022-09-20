import {
  Token, HtmlElementBuilder, HtmlTextBuilder, Extension, assert
} from '../kekpiler.js';
import {FragmentToken} from './fragments.js';

class TableOfContents extends Token.CustomBlock.extend() {
  constructor( text ) {
    super( text );

    this.table= null;
  }

  resourceType() {
    return 'none';
  }

  setTable( t ) {
    this.table= t;
  }

  _renderLevel( table ) {
    const children= table.map( tk => {
      // Render nested level
      if( Array.isArray(tk) ) {
        return this._renderLevel( tk );
      }

      // Create header link as list element
      const linkElem= new HtmlElementBuilder('a', new HtmlTextBuilder(tk.title()));
      linkElem.setAttribute('href', `#${tk.fragmentId()}`);

      return new HtmlElementBuilder('li', linkElem);
    });

    // Create ordered list filled with children
    return new HtmlElementBuilder('ol', ...children );
  }

  render() {
    return  new HtmlElementBuilder('p', this._renderLevel( this.table ));
  }
}

export class TableOfContentsExtension extends Extension {
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
    let currentLevel= 1;
    let currentArray= this.table;

    kek.document.forEachOfType(FragmentToken, tk => {
      // Only add items with title
      if( tk.title() ) {
        // Header might change current level
        if( tk instanceof Token.Header ) {
          // Add new nested levels
          const level= tk.headerLevel();
          while( level > currentLevel ) {
            const arr= [];
            currentArray.push(arr);
            currentArray= arr;
            currentLevel++;
          }

          // Move down levels
          if( level < currentLevel ) {
            currentArray= this.table;
            for( let i= 1; i< level; i++ ) {
              currentArray= currentArray[currentArray.length-1];
              assert( Array.isArray(currentArray) );
            }

            currentLevel= level;
          }
        }

        currentArray.push( tk );
      }
    });

    kek.document.forEachOfType(TableOfContents, tk => {
      tk.setTable( this.table );
    });
  }
}
