import { SacEvent } from "./SacEvent";

export interface ShareBigTextOptions {
  /**
   * 1度に送信する文字数
   * 
   * base64は 1byte/1文字. 1KB/1000文字
   * @default 10_000
   */
  readonly chunkSize?: number;
  /**
   * 1つ送るごとに待機するTick数\
   * (`g.game.isSkipping`でない場合のみカウントして待機するTick数)
   * @default 3
   */
  readonly waitFrame?: number;
}

/**
 * 多量の文字列を送受信する場合に利用する\
 * sendとwaitで同じ`key`を指定する必要がある
 *
 * @example
 * 生主から各プレイヤーに送信する
 * // SacServer
 * ShareBigText.waitingFromSingleUser("key", g.game.env.hostId, () => true);
 * // SacClient
 * if (g.game.env.isHost) {
 *   ShareBigText.send("key", shareText, () => { 送信完了時のイベント });
 * } else {
 *   ShareBigText.waitingFromSingleUser(
 *     "key",
 *     g.game.env.hostId,
 *     text => {
 *       shareText = text;
 *       console.log(`CLIENT: received`);
 *       return true; // true を返すことでこれ以上の受信を行わない
 *     }
 *   );
 * }
 *
 * @example
 * 各プレイヤーがサーバーに送信する
 * // SacServer
 * const textMap = new Map<string, string>();
 * const finishWaitText = ShareBigText.waitingFromMultiUser(
 *   "key",
 *   (playerId, text) => {
 *     textMap.set(playerId, text);
 *   },
 *   false  // サーバーからクライアントには送信しないのでfalseを指定する
 * );
 * // SacClient
 * ShareBigText.send("key", anyText);
 */
export const ShareBigText = {
  /**
   * テキストを送信する\
   * この関数は特に`g.game.isSkipping`の場合に呼び出す必要があるかチェックすべき
   * 
   * 引数の`option`は特にニコ生ゲームの実行時の仕様に関連します\
   * 特に１度に多量の通信を行った場合ゲームの通信が一時停止してしまします\
   * (2022年頃、約80KB以上の通信を１度に行うと2,3分停止)\
   * また AkashicEnigne は同フレーム内のイベントを纏めて送信するためフレームを分ける必要があります
   * @param key 識別キー
   * @param text テキスト
   * @param complated 全テキストを送信し終えたら呼ばれます
   * @param option テキスト共有時のオプション
   */
  send: (key: string, text: string, complated?: () => void, option?: ShareBigTextOptions): void => {
    const chunkSize = option?.chunkSize ?? 10_000;
    const waitFrame = option?.waitFrame ?? 3;

    let shareIndex = 0;
    let waitCount = waitFrame;
    g.game.onUpdate.add(share);


    function share() {
      // AkashicEnigne はスキップ時に送信を行わないため
      if (g.game.isSkipping) return;
      if (waitCount != 0) {
        waitCount -= 1;
        return;
      }
      waitCount = waitFrame;

      const chunk = text.substring(shareIndex, shareIndex += chunkSize);
      const last = shareIndex >= text.length;
      const textChunk = new TextChunk(key, chunk, last);

      g.game.env.hasClient
        ? g.game.env.client.sendEvent(textChunk)
        : g.game.env.server.broadcast(textChunk);

      if (last) {
        g.game.onUpdate.remove(share);
        complated?.();
      }
    }
  },
  /**
   * 特定の一人のユーザーからテキストを受信します\
   * 指定した異なるキー/ユーザーからのテキストは無視されます
   * @param key 識別キー
   * @param senderId 送信者のニコ生ゲームプレイヤーID
   * @param complate 全文を受信する度に呼び出される.`true`を返すと待受を終了する関数が実行されます
   * @param toClient`server.broadcast`を自動で行うか (サーバー環境のみ意味のある値)`default:true`
   * @returns 待受を終了する関数
   */
  waitingFromSingleUser: (
    key: string,
    senderId: string,
    complate: (text: string) => boolean | void,
    toClient: boolean = true,
  ): () => void => {
    let saveText = "";

    const finishWait = setupWaiting(event => {
      if (event.key !== key || event.playerId !== senderId) return;

      saveText += event.chunk;
      if (toClient && g.game.env.hasServer) {
        g.game.env.server.broadcast(event);
      }
      if (event.last) {
        if (complate(saveText)) finishWait();
      }
    });

    return finishWait;
  },
  /**
   * 複数のユーザーからテキストを受信します\
   * 指定した異なるキーの場合は無視され、ユーザーごとに独立したテキストを受信します
   * @param key 識別キー
   * @param complate 全文を受信する度に呼び出される.`true`を返すと待受を終了する関数が実行されます
   * @param toClient`server.broadcast`を自動で行うか (サーバー環境のみ意味のある値)`default:true`
   * @returns 待受を終了する関数
   */
  waitingFromMultiUser: (
    key: string,
    complate: (playerId: string, text: string) => boolean | void,
    toClient: boolean = true,
  ): () => void => {
    const map = new Map<string, string>();

    const finishWait = setupWaiting(event => {
      if (event.key !== key || event.playerId == null) return;

      let saveText = map.get(event.key);
      if (saveText == null) {
        saveText = "";
        map.set(event.key, saveText);
      }

      saveText += event.chunk;

      if (toClient && g.game.env.hasServer) {
        g.game.env.server.broadcast(event);
      }

      if (event.last) {
        if (complate(event.playerId, saveText)) finishWait();
      }
    });

    return finishWait;
  },
} as const;

class TextChunk extends SacEvent {
  constructor(
    readonly key: string,
    readonly chunk: string,
    readonly last: boolean,
  ) { super(); }
}

/**
 * @param receive`TextChunk`を受信したら呼び出される関数
 * @returns 待受を終了する関数
 */
function setupWaiting(receive: (event: TextChunk) => void): () => void {
  const eventSet = TextChunk.createEventSet(receive);

  let removeKeyClient: number;
  let removeKeyServer: number;
  if (g.game.env.hasClient) removeKeyClient = g.game.env.client.addEventSet(eventSet);
  if (g.game.env.hasServer) removeKeyServer = g.game.env.server.addEventSet(eventSet);

  let isFinished = false;
  return finishWait;

  function finishWait() {
    if (isFinished) return;
    if (g.game.env.hasClient) g.game.env.client.removeEventSets([removeKeyClient]);
    if (g.game.env.hasServer) g.game.env.server.removeEventSets([removeKeyServer]);
    isFinished = true;
  }
}
