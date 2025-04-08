// import "ClaudeV3_OpenTelemetryTraceViewer" from "./ClaudeV3_OpenTelemetryTraceViewer";

import ClaudeV3_OpenTelemetryTraceViewer from "./claude-v3";

function App() {
  return (<>
    <h1 className="text-2xl text-center">Gemini vs ChatGPT vs Claude vs DeepSeek vs Vercel v0</h1>
    <h2 className="text-xl text-center">React waterfall component using different AI models along with iteration</h2>
    <h3 className="text-xl text-center my-5">Claude</h3>

    <div className=''>
      <ClaudeV3_OpenTelemetryTraceViewer />

    </div>

  </>)
}

export default App;
