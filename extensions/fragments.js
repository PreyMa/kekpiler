import {abstractMethod, Mixin} from '../kekpiler.js';

export const FragmentToken= Mixin( klass => {
  return class FragmentToken extends klass {
    fragmentId() {
      abstractMethod();
    }

    title() {
      abstractMethod();
    }

    render() {
      const id= this.fragmentId();
      const elem= super.render();

      if( id && elem ) {
        elem.setAttribute('id', id);
      }

      return elem;
    }
  }
});
