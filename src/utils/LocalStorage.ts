/**
 * ローカルストレージを利用する
 */
export abstract class LocalStorage {
  private constructor() { }

  /**
   * ローカルストレージを使用可能か
   */
  public static get enable() {
    return this._enable;
  }
  private static _enable: boolean = false;

  /**
   * ストレージに保存するキーの先頭に付ける値\
   * ローカルストレージは共有なので、にキー名が被らないようにするために利用する
   */
  public static get uniqueID() {
    return this._uniqueID;
  }
  private static _uniqueID: string;

  /**
   * ローカルストレージ利用を申請する\
   * ローカルストレージを利用できるなら`LocalStorage.enable`が`true`に設定される\
   * ストレージを利用する前に最初にこのメソッドを呼び出す\
   * ☆５さん(hanakusogame)さんのコードを貰った (勝手に) \
   * https://github.com/hanakusogame/hitball/blob/d23e9f74be5442d26a12a7fbe2099ef525d6f09a/src/Input.ts#L346
   * @param uniqueId 保存するキー名に付けるゲーム独自の値。４文字以上
   */
  public static init(uniqueId: string): boolean {
    if (uniqueId.length < 4)
      throw new Error(`uniqueId は4文字以上にして下さい. uniqueId:${uniqueId}`);

    this._uniqueID = uniqueId;

    try {
      const DUMMY_KEY = "__dummy_key_wqxi__";
      const DUMMY_VALUE = "__dummy_value_wqxi__";
      if (typeof window.localStorage !== "undefined") {
        localStorage.setItem(DUMMY_KEY, DUMMY_VALUE);
        if (localStorage.getItem(DUMMY_KEY) === DUMMY_VALUE) {
          localStorage.removeItem(DUMMY_KEY);
          this._enable = true;
        }
      }
    } catch {
      this._enable = false;
    }

    return this.enable;
  }

  /**
   * ローカルストレージから値を取得します
   * @param key 読み込む値のキー
   * @returns 取得した値. ローカルストレージが利用不可, 値が無い場合は`null`
   */
  public static get(key: string): string | null {
    return this.enable ? localStorage.getItem(`${this.uniqueID}:${key}`) : null;
  }

  /**
   * ローカルストレージに値をセットします
   * @param key キー
   * @param value 値
   */
  public static set(key: string, value: string): void {
    if (this.enable) localStorage.setItem(`${this.uniqueID}:${key}`, value);
  }

  /**
   * ローカルストレージから値を削除します
   * @param key 削除する値のキー
   */
  public static remove(key: string): void {
    if (this.enable) localStorage.removeItem(`${this.uniqueID}:${key}`);
  }
}
