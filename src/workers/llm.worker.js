import {
    AutoTokenizer,
    AutoModelForCausalLM,
    TextStreamer,
    InterruptableStoppingCriteria,
} from "@huggingface/transformers";

class TextGenerationPipeline {
    static model_id = "Mozilla/Qwen2.5-0.5B-Instruct";

    static async getInstance(progress_callback = null) {
        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });
        this.model ??= AutoModelForCausalLM.from_pretrained(this.model_id, {
            progress_callback,
        });
        return Promise.all([this.tokenizer, this.model]);
    }
}

const stopping_criteria = new InterruptableStoppingCriteria();
let past_key_values_cache = null;

async function generate(messages) {
    const [tokenizer, model] = await TextGenerationPipeline.getInstance();

    let startTime;
    let numTokens = 0;
    let tps;
    let state = "answering"; // Default state

    // Special handling for DeepSeek model
    if (TextGenerationPipeline.model_id === "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX") {
        const [START_THINKING_TOKEN_ID, END_THINKING_TOKEN_ID] = tokenizer.encode(
            "<think></think>",
            { add_special_tokens: false },
        );
        state = "thinking";
    }

    const token_callback_function = (tokens) => {
        startTime ??= performance.now();
        if (numTokens++ > 0) {
            tps = (numTokens / (performance.now() - startTime)) * 1000;
        }

        // Handle thinking state transition for DeepSeek model
        if (TextGenerationPipeline.model_id === "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX") {
            if (Array.isArray(tokens) && tokens[0] === END_THINKING_TOKEN_ID) {
                state = "answering";
            }
        }
    };

    const callback_function = (output) => {
        // Extract just the assistant's response by removing everything before "assistant\n"
        const assistantResponse = output.split("assistant\n").pop();

        self.postMessage({
            status: "update",
            output: assistantResponse,
            tps,
            numTokens,
            state,
        });
    };

    const streamer = new TextStreamer(tokenizer, {
        skip_special_tokens: true,
        callback_function,
        token_callback_function,
    });

    self.postMessage({ status: "start" });

    // Handle input based on whether it's a chat message or plain text
    let inputs;
    if (Array.isArray(messages)) {
        inputs = tokenizer.apply_chat_template(messages, {
            add_generation_prompt: true,
            return_dict: true,
        });
    } else {
        inputs = tokenizer(messages);
    }

    const { past_key_values, sequences } = await model.generate({
        ...inputs,
        past_key_values: past_key_values_cache,
        max_new_tokens: 2048,
        do_sample: false,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
    });

    past_key_values_cache = past_key_values;

    const decoded = tokenizer.batch_decode(sequences, {
        skip_special_tokens: true,
    });

    // Extract just the assistant's final response
    const assistantResponse = decoded[0].split("assistant\n").pop();

    self.postMessage({
        status: "complete",
        output: assistantResponse,
    });
}

async function load() {
    self.postMessage({
        status: "loading",
        data: "Loading model...",
    });

    const [tokenizer, model] = await TextGenerationPipeline.getInstance((progress) => {
        // Convert the progress event from transformers.js into a percentage
        if (progress.status === "progress") {
            self.postMessage({
                status: "progress",
                data: {
                    progress: progress.progress,
                }
            });
        }
        // Forward the loading message
        if (progress.status === "loading") {
            self.postMessage({
                status: "loading",
                data: progress.message || "Loading model files...",
            });
        }
    });

    self.postMessage({
        status: "loading",
        data: "Warming up model...",
    });

    // Warmup
    const inputs = tokenizer("test");
    await model.generate({ ...inputs, max_new_tokens: 1 });

    self.postMessage({ status: "ready" });
}

self.addEventListener("message", async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case "load":
            load();
            break;
        case "generate":
            stopping_criteria.reset();
            generate(data);
            break;
        case "interrupt":
            stopping_criteria.interrupt();
            break;
        case "reset":
            past_key_values_cache = null;
            stopping_criteria.reset();
            break;
    }
}); 