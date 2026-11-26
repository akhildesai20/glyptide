# React + Glyptide

```bash
npm install /path/to/glyptide/packages/glyptide /path/to/glyptide/packages/glyptide-react
```

```tsx
import { useEffect, useRef } from "react";
import { Glyptide, type GlyptideHandle } from "@glyptide/react";
import { pipeTextToGlyptide } from "glyptide";
import "glyptide/styles.css";

export function AssistantReply({ stream }: { stream: AsyncIterable<string> }) {
  const ref = useRef<GlyptideHandle>(null);

  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      const instance = ref.current?.instance;
      if (!instance) return;
      await pipeTextToGlyptide(instance, stream, { signal: ac.signal });
    };
    void run();
    return () => ac.abort();
  }, [stream]);

  return (
    <Glyptide
      ref={ref}
      pattern="new-phrase-fade"
      theme="inherit"
      appearance={{ colorMode: "default", treatment: "ink" }}
    />
  );
}
```

Keep secrets on the server; pass only text chunks into the client.
