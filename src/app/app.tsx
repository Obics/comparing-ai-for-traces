import { TraceTable as ChatGPTV1 } from "./chatgpt/chatgpt-v1";
import ChatGPTV2 from "./chatgpt/chatgpt-v2";
import ChatGPTV3 from "./chatgpt/chatgpt-v3";
import ChatGPTV4 from "./chatgpt/chatgpt-v4";
import ClaudeV3_OpenTelemetryTraceViewer from "./claude-v3";
import ClaudeV35_OpenTelemetryTraceViewer from "./claude-v35";
import ClaudeV4_OpenTelemetryTraceViewer from "./claude-v4";
import { exampleTraces } from "./data";
import {TraceViewer as DeepSeekV3} from "./deepseek/deep-seek-v3";
import { TraceViewer as V0} from "./v0/trace-viewer";
import { TraceViewer as V0V2} from "./v0/trace-viewer-v2.tsx";
import { TraceViewerEnhanced as V0V3} from "./v0/trace-viewer-enchanced-v3.tsx";
import { TraceViewerEnhanced as V0V4} from "./v0/trace-viewer-enchanced-v4.tsx";
import GeminiV1 from "./gemini20Flash/gemini-v1.tsx";
import GeminiV2 from "./gemini20Flash/gemini-v2.tsx";
import GeminiV3 from "./gemini20Flash/gemini-v3.tsx";
import Gemini25ProV1 from "./gemini25Pro/gemini25-v1.tsx";
import Gemini25ProV2 from "./gemini25Pro/gemini25-v2.tsx";
import Gemini25ProV3 from "./gemini25Pro/gemini25-v3.tsx";
import Gemini25ProV4 from "./gemini25Pro/gemini25-v4.tsx";
import Gemini25ProV5 from "./gemini25Pro/gemini25-v5.tsx";

function App() {
  return (
  <>
    <h1 className="text-2xl text-center">Gemini vs ChatGPT vs Claude vs DeepSeek vs Vercel v0</h1>
    <h2 className="text-xl text-center">Building a react waterfall component using different AI models</h2>

    <div className='waterfalldiv'>
      <h3 >DeepSeek V1</h3>
      <DeepSeekV3 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >DeepSeek V2</h3>
      <span>DeepSeek broke completely after asking for smooth transitions...</span>
      {/* <DeepSeekV4 spans={exampleTraces} /> */}
    </div>

    <hr className="my-10"/>

    <div className='waterfalldiv'>
      <a href="https://v0.dev/chat/image-analysis-4IFRzmfCSRA" className="text-lg text-blue-500 text-center mx-auto">V0 Full Conversation</a>
      <h3 className="text-xl text-center my-5">Vercel V0 - V1</h3>
      <V0 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >Vercel V0 - V2</h3>
      <V0V2 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >Vercel V0 - V3</h3>
      <V0V3 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >Vercel V0 - V4</h3>
      <V0V4 spans={exampleTraces} />
    </div>

    <hr className="my-10"/>

    <div className='waterfalldiv'>
      <a href="https://claude.site/artifacts/fe86555a-03bb-430c-8fa9-64eb5708b0c3" className="text-lg text-blue-500 text-center mx-auto">Claude Full Conversation</a>
      <h3 >Claude</h3>
      <ClaudeV3_OpenTelemetryTraceViewer />
    </div>

    <div className='waterfalldiv'>
      <a href="https://claude.site/artifacts/fe86555a-03bb-430c-8fa9-64eb5708b0c3" className="text-lg text-blue-500 text-center mx-auto">Claude Full Conversation</a>
      <h3 className="text-xl text-center my-5">Claude (with my own minor changes)</h3>
      <ClaudeV35_OpenTelemetryTraceViewer spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <a href="https://claude.site/artifacts/fe86555a-03bb-430c-8fa9-64eb5708b0c3" className="text-lg text-blue-500 text-center mx-auto">Claude Full Conversation</a>
      <h3 className="text-xl text-center my-5">Claude V2</h3>
      <ClaudeV4_OpenTelemetryTraceViewer />
    </div>

    <hr className="my-10"/>

    
    
    <div className='waterfalldiv'>
      <a href="https://chatgpt.com/share/67f4ebb2-9f1c-8010-8326-90e3b2484f38" className="text-lg text-blue-500 text-center mx-auto">ChatGPT Full Conversation</a>

      <h3 className="text-xl text-center my-5">ChatGPT V1</h3>
      <ChatGPTV1 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 className="text-xl text-center my-5">ChatGPT V2</h3>
      <ChatGPTV2 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 className="text-xl text-center my-5">ChatGPT V3</h3>
      <ChatGPTV3 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >ChatGPT V4</h3>
      <ChatGPTV4 spans={exampleTraces} />
    </div>

    <hr className="my-10"/>

    <div className='max-w-[1000px] mx-auto text-center mt-20'>
      <a href="https://g.co/gemini/share/214cb3daf768" className="text-lg text-blue-500 text-center mx-auto">Gemini Full Conversation</a>
      <h3 >Gemini 2.0 Flash V1</h3>
      <GeminiV1 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >Gemini 2.0 Flash V2</h3>
      <GeminiV2 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv'>
      <h3 >Gemini 2.0 Flash V3</h3>
      <GeminiV3 spans={exampleTraces} />
    </div>

    <hr />

    <div className='waterfalldiv'>
      <h3 >Gemini 2.5 Pro V1</h3>
      <Gemini25ProV1 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv' >
      <h3 >Gemini 2.5 Pro V2</h3>
      <Gemini25ProV2 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv' >
      <h3 >Gemini 2.5 Pro V3</h3>
      <Gemini25ProV3 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv' >
      <h3 >Gemini 2.5 Pro V4</h3>
      <Gemini25ProV4 spans={exampleTraces} />
    </div>

    <div className='waterfalldiv' >
      <h3 >Gemini 2.5 Pro V5</h3>
      <Gemini25ProV5 spans={exampleTraces} />
    </div>

    <div className="h-60"></div>
  </>)
}

export default App;
