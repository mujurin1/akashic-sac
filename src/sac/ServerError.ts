import { SacEvent } from "./SacEvent";

export const ServerErrorFrom = {
  /**
   * `sacInitialize`で渡された`initialized`関数
   */
  initialize: "initialize",
  /**
   * `sacInitialize`で渡された`serverStart`関数
   */
  start: "start",
  /**
   * `SacEvent`から実行された関数
   */
  evented: "evented",
  /**
   * `SacEvent`から実行された関数 (クライアントサイド)\
   * (サーバーと同一の端末でクライアントコードが実行されている場合のみ発行されます)
   */
  client_evented: "client_evented",
} as const;
export type ServerErrorFrom = keyof typeof ServerErrorFrom;

export const ServerErrorDescription = {
  initialize: "sacInitialize関数の引数で渡され initialized関数",
  start: "sacInitialize関数の引数で渡され serverStart関数",
  evented: "Sacイベント経由で実行された関数",
  client_evented: "Sacイベント経由で実行された関数 (クライアントサイド)",
} as const satisfies Record<ServerErrorFrom, string>;

/**
 * サーバーでエラーが発生したエラーをクライアントへ通知するイベント
 */
export class ServerError extends SacEvent() {
  constructor(
    /** エラーの発生箇所 */
    readonly from: ServerErrorFrom,
    /** `catch`されたオブジェクト */
    readonly error: unknown,
  ) {
    super();
  }
}
