import {
  Mixin, Extension, abstractMethod, Token, assert, KekpilerImpl, MessageSeverity,
  CompoundRegularExpression
} from '../kekpiler.js';

const optionsRegex= new CompoundRegularExpression(
  /(?<attr>\w[^\s=]+)[^\S\n\r]*(=[^\S\n\r]*(("(?<val1>((?!(?<!\\)").)*)")|(?<val2>\w\S*)))?|/gm,
  /(?<err>\S+)/
);

export class Options {
  constructor( defaults= {} ) {
    this.assign( defaults );
  }

  _shadowsPrototype( key ) {
    return typeof this[key] !== 'undefined' && !this.hasOwnProperty(key);
  }

  assign( obj ) {
    for( const key in obj ) {
      // Prevent shadowing of prototype properties
      if( this._shadowsPrototype( key ) ) {
        continue;
      }

      this[key]= obj[key];
    }
  }

  parseOptions( string, logger, cb= null ) {
    const regex= optionsRegex.copy();

    let match;
    while((match= regex.exec( string )) !== null) {
      const groups= match.groups;
      if( groups.err ) {
        logger.addMessage(`Unexpected characters '${groups.err}' in options`);
        continue;
      }

      const attributeName= groups.attr;
      assert( attributeName, 'Expected to match an attribute name for options' );
      if( groups.val1 ) {
        this._setOption(attributeName, groups.val1, logger, cb);

      } else if( groups.val2 ) {
        this._setOption(attributeName, groups.val2, logger, cb);

      } else {
        this._setOption(attributeName, true, logger, cb);
      }
    }
  }

  _setOption( name, value, logger, cb ) {
    if( this.hasOwnProperty(name) ) {
      logger.addMessage(`Multiple values for the attribute '${name}' in options`);
      return;
    }

    if( this._shadowsPrototype(name) ) {
      logger.addMessage(`Disallowed attribute name '${name}' in options`);
      return;
    }

    if( cb ) {
      value= cb( name, value, this );
    }

    if( value !== undefined ) {
      this[name]= typeof value === 'string' ? value.replaceAll('\\"', '"') : value;
    }
  }
}

export class OptionsExtension extends Extension {
  init( kek ) {
    kek.setConfigDefaults({
      badOptionsMessageLevel: MessageSeverity.Warning
    });
    return 'Options';
  }
}
