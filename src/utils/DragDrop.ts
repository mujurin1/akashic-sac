export class DragDrop {
  private constructor() { }

  private static _dropedEvent: {
    /** ドロップされた時のイベント */
    drop: (e: DragEvent) => void;
    /** ドラッグ中に上を通った時のイベント */
    dragover: (e: DragEvent) => void;
  } | undefined;

  /**
   * ドラッグドロップを受け付けます\
   * 既に登録されているイベントがある場合、上書きされます
   *
   * DOMが存在しない環境ではイベントは受け付けない
   *
   * [`dropEffect`について](https://developer.mozilla.org/ja/docs/Web/API/DataTransfer/dropEffect)
   * @param dropedEvent ドロップされたときに呼ばれる関数
   * @param dropEffect ドロップエフェクト
   */
  public static hookDragDropEvent(
    dropedEvent: (e: DragEvent) => void,
    dropEffect: "none" | "copy" | "link" | "move"
  ): void {
    if (!g.game.env.hasClient) return;

    DragDrop._dropedEvent = {
      drop: dropedEvent,
      dragover: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer != null) e.dataTransfer.dropEffect = dropEffect;
      }
    };

    g.game.env.canvas.addEventListener("dragover", DragDrop._dropedEvent.dragover);
    g.game.env.canvas.addEventListener("drop", DragDrop._dropedEvent.drop);
  }

  /**
   * ドラッグアンドドロップ受け付けを解除する
   */
  public static unhookDragDropEvent(): void {
    if (!g.game.env.hasClient) return;
    if (DragDrop._dropedEvent == undefined) return;

    const cnvs = document.getElementsByTagName("canvas");
    const cnv = cnvs[0];
    cnv.removeEventListener("dragover", DragDrop._dropedEvent.dragover);
    cnv.removeEventListener("drop", DragDrop._dropedEvent.drop);

    DragDrop._dropedEvent = undefined;
  }

  /**
   * ドラッグドロップ経由でデータを取得します
   * (`hookDragDropEvent` のラップメソッド)
   * 
   * すでにドラッグドロップイベントが登録されている場合はそれを解除します
   *
   * ドラッグドロップイベントが不要になった場合は\
   * `unhookDragDropEvent()`を呼び出してください
   *
   * [`DataTransfer`について](https://developer.mozilla.org/ja/docs/Web/API/DataTransfer)
   *
   * @param droped ドラッグされたデータを受け取る関数
   * 
   * @example
```ts
dragDropedFile(data => {
  // ["Files"] | ['text/plain', 'text/uri-list'] | ...
  console.log(data.types);

  console.log(`Items: ${data.items.length}`);
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (item.kind === "string")
      data.items[i].getAsString(str => console.log(`${i}: ${str}`));
    else {
      const file = item.getAsFile();
      if (file == null) console.log(`${i}: null`);
      else console.log(`${i}:  NAME:${file.name}, TYPE:${file.type}, SIZE:${file.size}`);
    }
  }

  // 以下は上記の item.getAsFiles() と同じ内容を取得する。簡易版ファイル取得
  console.log(`Files: ${data.files.length}`);
  for (let i = 0; i < data.files.length; i++) console.log(data.files[i]);
});
```
 */
  public static dragDropedFile(droped: (e: DragEvent) => void): void {
    DragDrop.unhookDragDropEvent();
    DragDrop.hookDragDropEvent(
      dragEvent => {
        dragEvent.stopPropagation();
        dragEvent.preventDefault();
        if (dragEvent.dataTransfer != null) droped(dragEvent);
      },
      "copy");
  }
}
