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
    optionsRegex.forEachMatch( string, match => {
      const groups= match.groups;
      if( groups.err ) {
        logger.addMessage(`Unexpected characters '${groups.err}' in options`);
        return;
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
    });
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

export const ConfigurableToken= Mixin( klass => {
  return class ConfigurableToken extends klass {
    setOptions() {
      abstractMethod();
    }

    consumeNeighbours( it ) {
      const res= super.consumeNeighbours( it );
      if( res !== this ) {
        return res;
      }

      it.consumeFirstNonDivisionTokenIf( token => {
        if( token.is(Token.TokenType.CustomMetaBlock) && token instanceof OptionsToken ) {
          this.setOptions( token.getOptions() );
          return true;
        }
      });

      return this;
    }
  }
});

class OptionsToken extends Token.CustomMetaBlock.extend() {
  constructor(...args) {
    super(...args);
    this.wasConsumed= false;

    const kek= KekpilerImpl.the();
    const logger= kek.severityLogger( kek.config().badOptionsMessageLevel, this );

    this.options= new Options();
    this.options.parseOptions( this.referenceName(), logger );
  }

  getOptions() {
    this.wasConsumed= true;
    return this.options;
  }
}

export class OptionsExtension extends Extension {
  init( kek ) {
    kek.setConfigDefaults({
      badOptionsMessageLevel: MessageSeverity.Warning,
      unusedOptionsBlockMessageLevel: MessageSeverity.Warning
    });
    kek.registerCustomBlockToken('options', OptionsToken);
    return 'Options';
  }

  preRender( kek ) {
    kek._setInstance(() => {
      kek.document.forEachOfType(OptionsToken, token => {
        if( !token.wasConsumed ) {
          kek.addMessage(kek.config().unusedOptionsBlockMessageLevel, token, `Options block does not correspond to anything`);
        }
      });
    });
  }
}
