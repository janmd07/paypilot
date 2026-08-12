import OpenAI from 'openai';
import { executeX402PaymentAndFetch, ExecutionTraceStep, PaymentAuditRecord } from './x402-client';
import { synthesizeMarketDataLocally, MarketSummaryResource } from './synthesis';
import { globalPolicyEngine } from './policy';

export interface AgentRunResult {
  success: boolean;
  taskId: string;
  userTask: string;
  executionTrace: ExecutionTraceStep[];
  paymentAudit: PaymentAuditRecord;
  aiResponse?: string;
  error?: string;
}

/**
 * Server-side OpenAI Agent Workflow Executor
 */
export async function runPayPilotAgent(
  userTask: string,
  userWalletAddress?: string,
  originUrl: string = 'http://localhost:3000'
): Promise<AgentRunResult> {
  const taskId = 'task-' + Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your-openai-api-key')) {
    const errorMsg = 'OPENAI_API_KEY is not configured in server-side environment variables (.env.local).';
    const initialResult = await executeX402PaymentAndFetch(`${originUrl}/api/paid/market-summary`, taskId, userWalletAddress);
    
    return {
      success: initialResult.success,
      taskId,
      userTask,
      executionTrace: initialResult.trace,
      paymentAudit: initialResult.auditRecord,
      aiResponse: initialResult.success
        ? `[PayPilot Fallback Synthesis]\n\n${synthesizeMarketDataLocally(userTask, initialResult.resourceData as MarketSummaryResource, initialResult.auditRecord, globalPolicyEngine.getPolicy())}`
        : undefined,
      error: initialResult.success ? undefined : initialResult.error || errorMsg,
    };
  }

  const openai = new OpenAI({ apiKey });

  const tools: OpenAI.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_market_summary',
        description: 'Fetch real-time BTC and ETH market intelligence summary ($0.01 USDC on Base Sepolia testnet)',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
  ];

  try {
    // Step 1: Initial OpenAI chat request with tool calling
    const initialMessages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are PayPilot, an autonomous AI payment agent for Base. When a user requests digital market data, invoke the `get_market_summary` tool to access paid market intelligence via the x402 V2 protocol on Base Sepolia. Synthesize clear, professional insights.',
      },
      {
        role: 'user',
        content: userTask,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: initialMessages,
      tools,
      tool_choice: 'auto',
    });

    const choiceMessage = response.choices[0].message;
    const toolCalls = choiceMessage.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // Direct completion without paid tool
      const emptyResult = await executeX402PaymentAndFetch(`${originUrl}/api/paid/market-summary`, taskId, userWalletAddress);
      return {
        success: true,
        taskId,
        userTask,
        executionTrace: emptyResult.trace,
        paymentAudit: emptyResult.auditRecord,
        aiResponse: choiceMessage.content || 'Task completed.',
      };
    }

    // Step 2: OpenAI requested tool execution (`get_market_summary`)
    let x402Result: Awaited<ReturnType<typeof executeX402PaymentAndFetch>> | null = null;

    for (const toolCall of toolCalls) {
      if (toolCall.type === 'function' && toolCall.function.name === 'get_market_summary') {
        const fullEndpoint = `${originUrl}/api/paid/market-summary`;
        x402Result = await executeX402PaymentAndFetch(fullEndpoint, taskId, userWalletAddress);

        if (!x402Result.success) {
          return {
            success: false,
            taskId,
            userTask,
            executionTrace: x402Result.trace,
            paymentAudit: x402Result.auditRecord,
            error: x402Result.error || 'Payment execution failed.',
          };
        }
      }
    }

    if (!x402Result || !x402Result.success) {
      throw new Error('Failed to execute paid tool.');
    }

    // Step 3: Pass paid market data back to OpenAI model for final response synthesis
    const followUpMessages: OpenAI.ChatCompletionMessageParam[] = [
      ...initialMessages,
      choiceMessage,
      {
        role: 'tool',
        tool_call_id: toolCalls[0].id,
        content: JSON.stringify(x402Result.resourceData),
      },
    ];

    const finalCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: followUpMessages,
    });

    const finalAnswer = finalCompletion.choices[0].message.content || 'Market summary retrieved successfully.';

    return {
      success: true,
      taskId,
      userTask,
      executionTrace: x402Result.trace,
      paymentAudit: x402Result.auditRecord,
      aiResponse: finalAnswer,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent execution failed';
    const fallbackResult = await executeX402PaymentAndFetch(`${originUrl}/api/paid/market-summary`, taskId, userWalletAddress);
    return {
      success: fallbackResult.success,
      taskId,
      userTask,
      executionTrace: fallbackResult.trace,
      paymentAudit: fallbackResult.auditRecord,
      aiResponse: fallbackResult.success
        ? `[PayPilot Fallback Synthesis]\n\n${synthesizeMarketDataLocally(userTask, fallbackResult.resourceData as MarketSummaryResource)}`
        : undefined,
      error: fallbackResult.success ? undefined : msg,
    };
  }
}
