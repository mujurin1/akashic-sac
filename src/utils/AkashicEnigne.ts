type DynamicFontParameterObjectSlim = Partial<Omit<g.DynamicFontParameterObject, "game">> & {
  size: number;
};

/**
 * 簡易的にフォントを作成する
 * @param param `fontFamily`は未指定時は`sans-serif`になる
 */
export const createFont = (param: DynamicFontParameterObjectSlim): g.DynamicFont => {
  return new g.DynamicFont({
    game: g.game,
    fontFamily: param.fontFamily ?? "sans-serif",
    ...param,
  });
};
