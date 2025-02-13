type DynamicFontParameterObjectSlim = Partial<Omit<g.DynamicFontParameterObject, "game">> & {
  size: number;
};

/**
 * フォントを作成する
 * @param param`fontFamily`未指定時は`sans-serif`になる
 */
export function createFont(param: DynamicFontParameterObjectSlim): g.DynamicFont {
  return new g.DynamicFont({
    game: g.game,
    fontFamily: param.fontFamily ?? "sans-serif",
    ...param,
  });
}
