# Graph Report - .  (2026-07-05)

## Corpus Check
- 121 files · ~153,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1145 nodes · 3103 edges · 54 communities (47 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `useStore` - 66 edges
2. `LLMResponse` - 41 edges
3. `EvaluationFunctionExecutor` - 34 edges
4. `llmResponseDataToString()` - 34 edges
5. `StorageCache` - 29 edges
6. `MediaLookup` - 28 edges
7. `App()` - 27 edges
8. `queryLLM()` - 27 edges
9. `LLMSpec` - 27 edges
10. `StringLookup` - 26 edges

## Surprising Connections (you probably didn't know these)
- `buildContextPromptForVarsMetavars()` --indirect_call--> `cleanMetavarsFilterFunc()`  [INFERRED]
  chainforge/react-server/src/AiPopover.tsx → chainforge/react-server/src/backend/utils.ts
- `CodeEvaluatorNode()` --indirect_call--> `toStandardResponseFormat()`  [INFERRED]
  chainforge/react-server/src/CodeEvaluatorNode.tsx → chainforge/react-server/src/backend/utils.ts
- `FlowSidebarProps` --references--> `Dict`  [EXTRACTED]
  chainforge/react-server/src/FlowSidebar.tsx → chainforge/react-server/src/backend/typing.ts
- `ImageInfo` --references--> `Dict`  [EXTRACTED]
  chainforge/react-server/src/ImagePreviewModal.tsx → chainforge/react-server/src/backend/typing.ts
- `prepareItemsNodeData()` --indirect_call--> `escapeBraces()`  [INFERRED]
  chainforge/react-server/src/ItemsNode.tsx → chainforge/react-server/src/backend/template.ts

## Import Cycles
- 3-file cycle: `chainforge/react-server/src/ModelSettingSchemas.tsx -> chainforge/react-server/src/store.tsx -> chainforge/react-server/src/backend/backend.ts -> chainforge/react-server/src/ModelSettingSchemas.tsx`
- 4-file cycle: `chainforge/react-server/src/ModelSettingSchemas.tsx -> chainforge/react-server/src/store.tsx -> chainforge/react-server/src/backend/backend.ts -> chainforge/react-server/src/backend/query.ts -> chainforge/react-server/src/ModelSettingSchemas.tsx`

## Communities (54 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (79): react, AIPopover(), generatePrompts(), StringLookup, EvaluationScore, isImageResponseData(), LLMResponsesByVarDict, RatingDict (+71 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (93): dependencies, ace-builds, @anthropic-ai/sdk, assert, @azure/openai, bootstrap, bottleneck, browserify-zlib (+85 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (41): executepy(), simpleQueryLLM(), EvaluationFunctionExecutor, ContentType, EvalGenAssertionEmitter, AssertionWriterSystemMsgChatHistory, EvalCriteria, EvalCriteriaUID (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (51): AIGenCodeEvaluatorPopover(), AIGenCodeEvaluatorPopoverProps, AIGenReplaceItemsPopover(), AIGenReplaceItemsPopoverProps, AIGenReplaceTablePopover(), AIGenReplaceTablePopoverProps, buildContextPromptForVarsMetavars(), buildGenEvalCodePrompt() (+43 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (43): lz-string, App(), edgeTypes, getSharedFlowURLParam(), getViewportCenter(), getWindowCenter(), getWindowSize(), INITIAL_LLM() (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (43): countQueries(), extract_llm_key(), filterVarsByLLM(), CancelTracker, cleanEscapedBraces(), countNumLLMs(), DebounceRef, ensureUniqueName() (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (38): browserslist, development, production, devDependencies, @craco/craco, eslint, eslint-config-prettier, eslint-config-semistandard (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (33): areSetsEqual(), check_typeof_vals(), DEFAULT_JSON_HEADERS, executejs(), extract_llm_name(), extract_llm_nickname(), extract_llm_params(), getGlobalConfig() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (32): MAX_CONCURRENT, RATE_LIMIT_BY_MODEL, ModelSettingsDict, AlephAlphaLuminousSettings, AzureOpenAISettings, BedrockClaudeSettings, BedrockCommandTextSettings, BedrockJurassic2Settings (+24 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (28): check_typeof_vals(), executepy(), export_flow_bundle(), fetchExampleFlow(), fetchOpenAIEval(), gen_unique_media_filename(), get_flow_exists(), get_flows() (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (28): ChatMessage, GeminiChatContext, GeminiChatMessage, HuggingFaceChatHistory, LLMAPICall, MultiModalContentAnthropic, MultiModalContentGemini, MultiModalContentOpenAI (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (21): parseTableData(), Func, TabularDataColType, TabularDataRowType, CellTextareaProps, EditableTableProps, tableHeaderStyle, ImagePreviewModalRef (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.21
Nodes (17): ResponseInfo, LLM, LLMProvider, _IntermediateLLMResponseType, PromptPipeline, yield_as_completed(), prompt_model(), ChatHistoryInfo (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (9): jszip, url, importFlowBundle(), MediaLookup, base64ToBlob(), dataURLToBlob(), get_image_infos(), MediaNode() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (12): Row, AISuggestionsManager, consumeAIErrors(), enoughRows(), shouldClearSuggestions(), isEqual(), isExtension(), isExtensionIgnoreEmpty() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (19): xlsx, grabResponses(), to_standard_format(), BaseLLMResponseObject, LLMResponse, CodeEvaluatorComponentRef, FeedbackStepProps, GradingViewProps (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (18): EvaluationResults, truncStr(), PlotLegend(), PlotLegendProps, ResponseBox(), colorPalettes, addLineBreaks(), calcLeftPaddingForYLabels() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (20): JSONCompatible, LLMGroup, LLMSpec, GlobalSettingsType, DEFAULT_INIT_LLMS, LLMListContainerProps, CardHeader, DragItem (+12 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (18): ALERT_MODAL_STYLE, AlertModal, AlertModalContext, AlertModalRef, PythonInterpreter, VarsContext, getVarsAndMetavars(), CodeEvaluatorComponentProps (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (17): DuplicateVariableNameError, UserForcedPrematureExit, TogetherChatSettings, CustomEdge(), CustomEdgeProps, EdgePathContainer, flattenLLMGroup(), flattenLLMProviders() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (15): IS_RUNNING_LOCALLY, DUMMY_RESPONSE_CACHE, EvaluatedResponsesResults, ImageContentAnthropic, ImageContentGemini, ImageContentOpenAI, ImageTypeAnthropic, isEqualChatHistory() (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (13): QueryProgress, CodeEvaluatorComponent, LLMEvaluatorComponentRef, GatheringResponsesRingProgress(), LLMItemButtonGroupProps, EVAL_TYPE_PRETTY_NAME, EVALUATOR_PRESETS, EvaluatorContainerDesc (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (10): Any, A simple custom model provider to add to the ChainForge interface,     to suppo, ChatMessage, CustomProviderProtocol, provider(), A Callable protocol to implement for custom model provider completions., Define a call to your custom provider.            Parameters:            - `p, A single message, in OpenAI chat message format. (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (12): AreYouSureModal, AreYouSureModalProps, AreYouSureModalRef, BaseNode(), BaseNodeProps, IS_RUNNING_LOCALLY, DeleteConfirmProps, NodeLabel() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (13): _extract_alephalpha_responses(), _extract_anthropic_chat_responses(), _extract_anthropic_text_responses(), _extract_chatgpt_responses(), _extract_gemini_responses(), _extract_google_ai_responses(), _extract_huggingface_responses(), _extract_ollama_responses() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (12): stripLLMDetailsFromResponses(), DEFAULT_LLM_ITEM, LLMEvaluatorComponent, LLMEvaluatorComponentProps, LLMEvaluatorNode(), LLMEvaluatorNodeProps, OUTPUT_FORMAT_PROMPTS, OUTPUT_FORMAT_PROMPTS_REASONING (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (12): compute_file_hash(), _get_unique_flow_name(), import_flow_bundle(), Import a flow bundle (.cfzip file) that contains a flow.json and associated medi, Verifies if a media file's content hash matches the hash in its filename.     R, Save, rename, or duplicate a flow, Return a non-name-clashing filename to store in the local disk., Calculate SHA256 hash of a file-like object (does not reset pointer). (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (6): exclude_key(), initCustomProvider(), loadCachedCustomProviders(), Initalizes custom model provider(s) defined in a Python script,         and ret, Initalizes all custom model provider(s) in the local provider_scripts directory., _ProviderRegistry

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (10): get_flow(), get_settings(), Return the requested config, Save the current settings, save_settings(), generate_key(), load_json_file(), Load a JSON file. If secure is True, load the encrypted file and decrypt it usin (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.35
Nodes (7): extract_llm_provider(), getEnumName(), getProvider(), NativeLLM, RATE_LIMIT_BY_PROVIDER, baseModelToProvider(), getSettingsSchemaForLLM()

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (11): call_azure_openai(), call_bedrock(), call_chatgpt(), call_deepseek(), call_minimax(), call_together(), call_webllm(), construct_chat_history() (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (8): InspectFooterProps, createJSEvalCodeFor(), Operator, OPERATORS, RESPONSE_FORMATS, ResponseFormat, SimpleEvalNode(), SimpleEvalNodeProps

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (6): callCustomProvider(), make_sync_call_async(), Makes a blocking synchronous call asynchronous, so that it can be awaited., Initalizes custom model provider(s) defined in a Python script,         and ret, Calls a custom model provider and returns the response.          POST'd data s, removeCustomProvider()

### Community 34 - "Community 34"
Cohesion: 0.31
Nodes (6): AlertModalProvider(), ColorSchemeToggle(), ColorThemeProvider(), getOSPreferredColorScheme(), root, reportWebVitals()

### Community 35 - "Community 35"
Cohesion: 0.36
Nodes (9): appendEndSlashIfMissing(), call_google_ai(), call_ollama_provider(), construct_image_payload(), construct_text_payload(), getBase64DataFromDataURL(), getMimeTypeFromDataURL(), imagesToBase64() (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 37 - "Community 37"
Cohesion: 0.32
Nodes (7): FileWithContent, ImageFileDropzone(), ImageFileDropzoneProps, read_file(), UploadFileModal, UploadFileModalProps, UploadFileModalRef

### Community 38 - "Community 38"
Cohesion: 0.38
Nodes (7): ChatHistory, APP_IS_RUNNING_LOCALLY(), call_anthropic(), call_custom_provider(), call_flask_backend(), is_newer_anthropic_model(), route_fetch()

### Community 39 - "Community 39"
Cohesion: 0.47
Nodes (4): main(), # TODO: Add this back, # TODO: Reimplement this where the React server is given the backend's port befo, run_server()

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (4): semi, singleQuote, tabWidth, trailingComma

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (3): areEqualLLMResponseData(), areEqualPromptVarsDictValues(), areEqualVarsDicts()

## Knowledge Gaps
- **317 isolated node(s):** `trailingComma`, `tabWidth`, `semi`, `singleQuote`, `webpack` (+312 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 1` to `Community 0`, `Community 4`, `Community 6`, `Community 13`, `Community 15`, `Community 48`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **Why does `Dict` connect `Community 12` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 30`, `Community 38`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `lz-string` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `# TODO: Add this back`, `# TODO: Reimplement this where the React server is given the backend's port befo`, `A simple custom model provider to add to the ChainForge interface,     to suppo` to the rest of the system?**
  _354 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05217757205975174 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.021505376344086023 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.057942057942057944 - nodes in this community are weakly interconnected._