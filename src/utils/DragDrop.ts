interface DropedEvent {
  /** ドロップされたときに呼ばれる関数 */
  drop: (e: DragEvent) => void;
  /** ドラッグされて通過中に呼ばれる関数 */
  dragover: (e: DragEvent) => void;
}


let _dropedEvent: DropedEvent | undefined;

export const DragDrop = {
  /**
   * ドラッグドロップイベントを登録します\
   * 既に登録されているイベントは上書きされます
   * @param droped ドロップされたときに呼ばれる関数
   * @param dragover ドラッグされて通過中に呼ばれる関数
   * @example
```ts
DragDrop.dragDropedFile(data => {
  const dataTransfer = data.dataTransfer;
  if (dataTransfer == null) return;

  // ["Files"] | ['text/plain', 'text/uri-list'] | ...
  console.log(dataTransfer.types);

  console.log(`Items: ${dataTransfer.items.length}`);
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i];
    if (item.kind === "string")
      dataTransfer.items[i].getAsString(str => console.log(`${i}: ${str}`));
    else {
      const file = item.getAsFile();
      if (file == null) console.log(`${i}: null`);
      else console.log(`${i}:  NAME:${file.name}, TYPE:${file.type}, SIZE:${file.size}`);
    }
  }

  // 以下は上記の item.getAsFiles() と同じ内容を取得する。簡易版ファイル取得
  console.log(`Files: ${dataTransfer.files.length}`);
  for (let i = 0; i < dataTransfer.files.length; i++) console.log(dataTransfer.files[i]);
});
```
   */
  hook: (
    droped: (e: DragEvent) => void,
    dragover?: (e: DragEvent) => void,
  ): void => {
    if (!g.game.env.hasClient) return;

    DragDrop.unhook();
    _dropedEvent = {
      drop: e => {
        e.stopPropagation();
        e.preventDefault();
        droped(e);
      },
      dragover: e => {
        e.preventDefault();
        e.stopPropagation();
        dragover?.(e);
      }
    };

    g.game.env.canvas.addEventListener("dragover", _dropedEvent.dragover);
    g.game.env.canvas.addEventListener("drop", _dropedEvent.drop);
  },
  /**
   * ドラッグアンドドロップイベントを解除します
   */
  unhook: (): void => {
    if (!g.game.env.hasClient) return;
    if (_dropedEvent == undefined) return;

    const cnvs = document.getElementsByTagName("canvas");
    const cnv = cnvs[0];
    cnv.removeEventListener("dragover", _dropedEvent.dragover);
    cnv.removeEventListener("drop", _dropedEvent.drop);

    _dropedEvent = undefined;
  },
} as const;
