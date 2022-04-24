import * as Kek from '../kekpiler.js';

class LineBreakToken extends Kek.Token.CustomBlock {
  render() {
    return new Kek.HtmlSingleElementBuilder('br');
  }

  resourceType() {
    return 'none';
  }
}

export class LineBreakExtension extends Kek.Extension {
  init( k ) {
    k.registerCustomBlockToken('break', LineBreakToken);
  }
}
