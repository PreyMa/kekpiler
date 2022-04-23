import {abstractMethod} from '../kekpiler.js';

export function FragmentToken( klass ) {
  return class FragmentToken extends klass {
    fragmentId() {
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
}
