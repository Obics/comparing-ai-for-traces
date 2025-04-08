// import "ClaudeV3_OpenTelemetryTraceViewer" from "./ClaudeV3_OpenTelemetryTraceViewer";

import ClaudeV3_OpenTelemetryTraceViewer from "./claude-v3";
import { exampleTraces } from "./data";
import { TraceViewer } from "./v0/trace-viewer";

function App() {
  return (<>
    <h1 className="text-2xl text-center">Gemini vs ChatGPT vs Claude vs DeepSeek vs Vercel v0</h1>
    <h2 className="text-xl text-center">React waterfall component using different AI models along with iteration</h2>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Claude</h3>
      <ClaudeV3_OpenTelemetryTraceViewer />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Vercel V0</h3>
      <TraceViewer spans={exampleTraces} />
    </div>

  </>)
}

export default App;
