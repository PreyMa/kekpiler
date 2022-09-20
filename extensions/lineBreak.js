import {
  Token, HtmlSingleElementBuilder, Extension
} from '../kekpiler.js';

class LineBreakToken extends Token.CustomBlock.extend() {
  render() {
    return new HtmlSingleElementBuilder('br');
  }

  isInlineToken() {
    return true;
  }

  resourceType() {
    return 'none';
  }
}

export class LineBreakExtension extends Extension {
  init( k ) {
    k.registerCustomBlockToken('break', LineBreakToken);
  }
}
