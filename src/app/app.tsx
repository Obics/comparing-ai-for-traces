import { TraceTable as ChatGPTV1 } from "./chatgpt/chatgpt-v1";
import ChatGPTV2 from "./chatgpt/chatgpt-v2";
import ChatGPTV3 from "./chatgpt/chatgpt-v3";
import ChatGPTV4 from "./chatgpt/chatgpt-v4";
import ClaudeV3_OpenTelemetryTraceViewer from "./claude-v3";
import { exampleTraces } from "./data";
import {TraceViewer as DeepSeekV3} from "./deepseek/deep-seek-v3";
import DeepSeekV4 from "./deepseek/deep-seek-v4";
import { TraceViewer as V0} from "./v0/trace-viewer";
import { TraceViewer as V0V2} from "./v0/trace-viewer-v2.tsx";
import { TraceViewerEnhanced as V0V3} from "./v0/trace-viewer-enchanced-v3.tsx";
import GeminiV1 from "./gemini/gemini-v1.tsx";
import GeminiV2 from "./gemini/gemini-v2.tsx";
import GeminiV3 from "./gemini/gemini-v3.tsx";

function App() {
  return (<>
    <h1 className="text-2xl text-center">Gemini vs ChatGPT vs Claude vs DeepSeek vs Vercel v0</h1>
    <h2 className="text-xl text-center">React waterfall component using different AI models along with iteration</h2>

    <div className='max-w-[1000px] mx-auto text-center'>
      <a href="https://claude.site/artifacts/fe86555a-03bb-430c-8fa9-64eb5708b0c3" className="text-lg text-blue-500 text-center mx-auto">Claude Full Conversation</a>
      <h3 className="text-xl text-center my-5">Claude</h3>
      <ClaudeV3_OpenTelemetryTraceViewer />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Vercel V0 - V1</h3>
      <V0 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Vercel V0 - V2</h3>
      <V0V2 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Vercel V0 - V3</h3>
      <V0V3 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">DeepSeek V3</h3>
      <DeepSeekV3 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">DeepSeek V4</h3>
      <span>DeepSeek broke completely after asking for smooth transitions...</span>
      {/* <DeepSeekV4 spans={exampleTraces} /> */}
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <a href="https://chatgpt.com/share/67f4ebb2-9f1c-8010-8326-90e3b2484f38" className="text-lg text-blue-500 text-center mx-auto">ChatGPT Full Conversation</a>

      <h3 className="text-xl text-center my-5">ChatGPT V1</h3>
      <ChatGPTV1 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">ChatGPT V2</h3>
      <ChatGPTV2 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">ChatGPT V3</h3>
      <ChatGPTV3 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">ChatGPT V4</h3>
      <ChatGPTV4 spans={exampleTraces} />
    </div>


    <div className='max-w-[1000px] mx-auto text-center mt-20'>
      <a href="https://g.co/gemini/share/214cb3daf768" className="text-lg text-blue-500 text-center mx-auto">Gemini Full Conversation</a>
      <h3 className="text-xl text-center my-5">Gemini V1</h3>
      <GeminiV1 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Gemini V2</h3>
      <GeminiV2 spans={exampleTraces} />
    </div>

    <div className='max-w-[1000px] mx-auto text-center'>
      <h3 className="text-xl text-center my-5">Gemini V3</h3>
      <GeminiV3 spans={exampleTraces} />
    </div>

    <div className="h-60"></div>
  </>)
}

export default App;
