# Graph Report - D:\Uni\Internet und Gesellschaft\Chainforge\ChainForge  (2026-07-14)

## Corpus Check
- 126 files · ~157,440 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1217 nodes · 3214 edges · 76 communities (59 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.74)
- Token cost: 146,189 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_Provider API Calls|Provider API Calls]]
- [[_COMMUNITY_Media & Tabular Data Types|Media & Tabular Data Types]]
- [[_COMMUNITY_AI Assist Popover|AI Assist Popover]]
- [[_COMMUNITY_NPM Package Scripts|NPM Package Scripts]]
- [[_COMMUNITY_Evaluator Nodes & Inspectors|Evaluator Nodes & Inspectors]]
- [[_COMMUNITY_Project Docs & Architecture|Project Docs & Architecture]]
- [[_COMMUNITY_Prompt Node & LLM Lists|Prompt Node & LLM Lists]]
- [[_COMMUNITY_App Shell & Menus|App Shell & Menus]]
- [[_COMMUNITY_Backend Query Orchestration|Backend Query Orchestration]]
- [[_COMMUNITY_Flask Python Evaluation|Flask Python Evaluation]]
- [[_COMMUNITY_Node Shell Components|Node Shell Components]]
- [[_COMMUNITY_Prompt Templating|Prompt Templating]]
- [[_COMMUNITY_AI Suggestions Manager|AI Suggestions Manager]]
- [[_COMMUNITY_Model Settings Schemas|Model Settings Schemas]]
- [[_COMMUNITY_Media Lookup Cache|Media Lookup Cache]]
- [[_COMMUNITY_EvalGen Function Executor|EvalGen Function Executor]]
- [[_COMMUNITY_LLM List Items|LLM List Items]]
- [[_COMMUNITY_Storage Cache|Storage Cache]]
- [[_COMMUNITY_EvalGen Criteria Types|EvalGen Criteria Types]]
- [[_COMMUNITY_Uncertainty Auditor|Uncertainty Auditor]]
- [[_COMMUNITY_Vis Node Plotting|Vis Node Plotting]]
- [[_COMMUNITY_EvalGen Utils|EvalGen Utils]]
- [[_COMMUNITY_Query Pipeline|Query Pipeline]]
- [[_COMMUNITY_Response Inspector|Response Inspector]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Split Node|Split Node]]
- [[_COMMUNITY_Text Fields & Items Nodes|Text Fields & Items Nodes]]
- [[_COMMUNITY_Join Node|Join Node]]
- [[_COMMUNITY_Response Display Boxes|Response Display Boxes]]
- [[_COMMUNITY_Custom Providers UI|Custom Providers UI]]
- [[_COMMUNITY_Response Ratings|Response Ratings]]
- [[_COMMUNITY_Model Registry|Model Registry]]
- [[_COMMUNITY_Python Provider Registry|Python Provider Registry]]
- [[_COMMUNITY_String Interning|String Interning]]
- [[_COMMUNITY_Zustand Store|Zustand Store]]
- [[_COMMUNITY_Custom Provider Protocol|Custom Provider Protocol]]
- [[_COMMUNITY_Flow Storage & Upload|Flow Storage & Upload]]
- [[_COMMUNITY_Cancel Tracker|Cancel Tracker]]
- [[_COMMUNITY_Simple Eval Node & Status|Simple Eval Node & Status]]
- [[_COMMUNITY_Secure Settings Save|Secure Settings Save]]
- [[_COMMUNITY_Inspector & Resize|Inspector & Resize]]
- [[_COMMUNITY_Model Settings Modal|Model Settings Modal]]
- [[_COMMUNITY_EvalGen Grading Step|EvalGen Grading Step]]
- [[_COMMUNITY_Alert Modal & Sidebar|Alert Modal & Sidebar]]
- [[_COMMUNITY_Theme & Entry Point|Theme & Entry Point]]
- [[_COMMUNITY_Web App Manifest|Web App Manifest]]
- [[_COMMUNITY_Shared Type Aliases|Shared Type Aliases]]
- [[_COMMUNITY_Example Flows Modal|Example Flows Modal]]
- [[_COMMUNITY_CLI Entry Point|CLI Entry Point]]
- [[_COMMUNITY_Custom Provider Calls|Custom Provider Calls]]
- [[_COMMUNITY_Prettier Config|Prettier Config]]
- [[_COMMUNITY_Error Types|Error Types]]
- [[_COMMUNITY_Rate Limiter|Rate Limiter]]
- [[_COMMUNITY_Flask ResponseInfo|Flask ResponseInfo]]
- [[_COMMUNITY_Default Model Settings|Default Model Settings]]
- [[_COMMUNITY_Cache Helpers|Cache Helpers]]
- [[_COMMUNITY_Logo 512 Image|Logo 512 Image]]
- [[_COMMUNITY_EvalGen Readme|EvalGen Readme]]
- [[_COMMUNITY_Pyodide Worker|Pyodide Worker]]
- [[_COMMUNITY_Flow Existence Check|Flow Existence Check]]
- [[_COMMUNITY_Media To Text|Media To Text]]
- [[_COMMUNITY_Image CORS Proxy|Image CORS Proxy]]
- [[_COMMUNITY_Craco Webpack Config|Craco Webpack Config]]
- [[_COMMUNITY_Markdown Rendering|Markdown Rendering]]
- [[_COMMUNITY_Image URL Utils|Image URL Utils]]
- [[_COMMUNITY_Logo 192 Image|Logo 192 Image]]
- [[_COMMUNITY_jStat Typings|jStat Typings]]
- [[_COMMUNITY_React Logo SVG|React Logo SVG]]
- [[_COMMUNITY_Model Settings Doc|Model Settings Doc]]
- [[_COMMUNITY_Visualization Doc|Visualization Doc]]

## God Nodes (most connected - your core abstractions)
1. `useStore` - 68 edges
2. `LLMResponse` - 43 edges
3. `llmResponseDataToString()` - 36 edges
4. `EvaluationFunctionExecutor` - 34 edges
5. `StorageCache` - 29 edges
6. `MediaLookup` - 28 edges
7. `App()` - 27 edges
8. `queryLLM()` - 27 edges
9. `LLMSpec` - 27 edges
10. `StringLookup` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Preconverted OpenAI Evals Flows` --semantically_similar_to--> `MIT License (Ian Arawjo, 2023)`  [INFERRED] [semantically similar]
  chainforge/oaievals/README.md → LICENSE.md
- `ChainForge` --references--> `GitHub Bug Report Issue Template`  [INFERRED]
  README.md → .github/ISSUE_TEMPLATE/bug_report.md
- `ChainForge` --references--> `GitHub Feature Request Issue Template`  [INFERRED]
  README.md → .github/ISSUE_TEMPLATE/feature_request.md
- `Create React App Scripts (react-server README)` --conceptually_related_to--> `react-server React/TypeScript Frontend`  [INFERRED]
  chainforge/react-server/README.md → CLAUDE.md
- `responsesToTable()` --indirect_call--> `resp()`  [INFERRED]
  chainforge/react-server/src/LLMResponseInspector.tsx → chainforge/react-server/src/backend/__test__/uncertainty.test.ts

## Import Cycles
- 3-file cycle: `chainforge/react-server/src/ModelSettingSchemas.tsx -> chainforge/react-server/src/store.tsx -> chainforge/react-server/src/backend/backend.ts -> chainforge/react-server/src/ModelSettingSchemas.tsx`
- 4-file cycle: `chainforge/react-server/src/ModelSettingSchemas.tsx -> chainforge/react-server/src/store.tsx -> chainforge/react-server/src/backend/backend.ts -> chainforge/react-server/src/backend/query.ts -> chainforge/react-server/src/ModelSettingSchemas.tsx`

## Hyperedges (group relationships)
- **ChainForge Comparison and Evaluation Feature Set** — readme_prompt_permutations, readme_model_settings, readme_evaluation_nodes, readme_visualization_nodes, readme_chat_turns [EXTRACTED 1.00]
- **evalgen Module Component Architecture** — chainforge_react_server_src_backend_evalgen_readme_evalgen_module, chainforge_react_server_src_backend_evalgen_readme_executor, chainforge_react_server_src_backend_evalgen_readme_utils, chainforge_react_server_src_backend_evalgen_readme_oai_utils [EXTRACTED 1.00]
- **ChainForge Browser-Heavy Two-Part Architecture** — claude_chainforge_python_package, claude_react_server_frontend, claude_browser_side_backend, claude_thin_flask_backend [EXTRACTED 1.00]

## Communities (76 total, 17 thin omitted)

### Community 0 - "NPM Dependencies"
Cohesion: 0.02
Nodes (93): dependencies, ace-builds, @anthropic-ai/sdk, assert, @azure/openai, bootstrap, bottleneck, browserify-zlib (+85 more)

### Community 1 - "Provider API Calls"
Cohesion: 0.05
Nodes (63): Any, Define a call to your custom provider.            Parameters:            - `p, ChatHistory, ALEPH_ALPHA_API_KEY, ALEPH_ALPHA_BASE_URL, ANTHROPIC_API_KEY, appendEndSlashIfMissing(), areEqualLLMResponseData() (+55 more)

### Community 2 - "Media & Tabular Data Types"
Cohesion: 0.05
Nodes (49): parseTableData(), ChatMessage, FileWithContent, Func, GeminiChatContext, GeminiChatMessage, HuggingFaceChatHistory, ImageContentAnthropic (+41 more)

### Community 3 - "AI Assist Popover"
Cohesion: 0.09
Nodes (47): AIGenCodeEvaluatorPopover(), AIGenCodeEvaluatorPopoverProps, AIGenReplaceItemsPopover(), AIGenReplaceItemsPopoverProps, AIGenReplaceTablePopover(), AIGenReplaceTablePopoverProps, buildContextPromptForVarsMetavars(), buildGenEvalCodePrompt() (+39 more)

### Community 4 - "NPM Package Scripts"
Cohesion: 0.05
Nodes (38): browserslist, development, production, devDependencies, @craco/craco, eslint, eslint-config-prettier, eslint-config-semistandard (+30 more)

### Community 5 - "Evaluator Nodes & Inspectors"
Cohesion: 0.07
Nodes (30): EvalGenReport, BaseLLMResponseObject, EvaluatedResponsesResults, LLMResponse, PythonInterpreter, VarsContext, CodeEvaluatorComponent, CodeEvaluatorComponentProps (+22 more)

### Community 6 - "Project Docs & Architecture"
Cohesion: 0.07
Nodes (35): Preconverted OpenAI Evals Flows, React App HTML Shell (index.html), Google Analytics gtag (G-RN3FDBLMCR), robots.txt (Allow All Crawlers), Create React App Scripts (react-server README), evalgen: Grading and Evaluation Function Selection Module, Python Dependencies (requirements.txt), In-Browser TypeScript Backend (src/backend/) (+27 more)

### Community 7 - "Prompt Node & LLM Lists"
Cohesion: 0.09
Nodes (28): LLMGroup, ensureUniqueName(), getLLMsInPulledInputData(), ChatHistoryView, ChatHistoryViewProps, DEFAULT_LLM_ITEM, LLMEvaluatorComponent, OUTPUT_FORMAT_PROMPTS (+20 more)

### Community 8 - "App Shell & Menus"
Cohesion: 0.10
Nodes (27): App(), edgeTypes, getSharedFlowURLParam(), getViewportCenter(), getWindowCenter(), getWindowSize(), IS_RUNNING_LOCALLY, nodeEmojis (+19 more)

### Community 9 - "Backend Query Orchestration"
Cohesion: 0.11
Nodes (28): areSetsEqual(), check_typeof_vals(), countQueries(), DEFAULT_JSON_HEADERS, executejs(), extract_llm_key(), extract_llm_name(), extract_llm_params() (+20 more)

### Community 10 - "Flask Python Evaluation"
Cohesion: 0.08
Nodes (26): check_typeof_vals(), executepy(), export_flow_bundle(), fetchExampleFlow(), fetchOpenAIEval(), gen_unique_media_filename(), get_flows(), get_media() (+18 more)

### Community 11 - "Node Shell Components"
Cohesion: 0.12
Nodes (21): AIPopover(), AreYouSureModal, AreYouSureModalProps, AreYouSureModalRef, costPerRequest(), BaseNode(), BaseNodeProps, IS_RUNNING_LOCALLY (+13 more)

### Community 12 - "Prompt Templating"
Cohesion: 0.13
Nodes (9): extractTemplateVars(), isDict(), PromptPermutationGenerator, PromptTemplate, StringTemplate, LLMResponseData, PromptVarsDict, PromptVarType (+1 more)

### Community 13 - "AI Suggestions Manager"
Cohesion: 0.17
Nodes (12): Row, AISuggestionsManager, consumeAIErrors(), enoughRows(), shouldClearSuggestions(), isEqual(), isExtension(), isExtensionIgnoreEmpty() (+4 more)

### Community 14 - "Model Settings Schemas"
Cohesion: 0.08
Nodes (24): MAX_CONCURRENT, RATE_LIMIT_BY_MODEL, AlephAlphaLuminousSettings, AzureOpenAISettings, BedrockClaudeSettings, BedrockCommandTextSettings, BedrockJurassic2Settings, BedrockLlama2ChatSettings (+16 more)

### Community 15 - "Media Lookup Cache"
Cohesion: 0.22
Nodes (6): jszip, importFlowBundle(), MediaLookup, dataURLToBlob(), MediaNode(), FormData

### Community 16 - "EvalGen Function Executor"
Cohesion: 0.16
Nodes (3): EvaluationFunctionExecutor, EvalFunction, ResponseUID

### Community 17 - "LLM List Items"
Cohesion: 0.13
Nodes (19): LLMSpec, QueryProgress, GlobalSettingsType, LLMEvaluatorComponentProps, LLMEvaluatorComponentRef, LLMEvaluatorNodeProps, GatheringResponsesRingProgress(), LLMItemButtonGroupProps (+11 more)

### Community 18 - "Storage Cache"
Cohesion: 0.18
Nodes (6): lz-string, clearCachedResponses(), exportCache(), get_cache_keys_related_to_id(), importCache(), StorageCache

### Community 19 - "EvalGen Criteria Types"
Cohesion: 0.15
Nodes (15): AssertionWriterSystemMsgChatHistory, EvalCriteria, EvalCriteriaUID, EvalExecutionError, EvalFunctionReport, EvalFunctionResult, EvalFunctionSetReport, validEvalCriteriaFormat() (+7 more)

### Community 20 - "Uncertainty Auditor"
Cohesion: 0.18
Nodes (17): resp(), bootstrapCI(), castEvalScoreToNum(), CI, confidenceInterval(), Disparity, estimateGroups(), findGroupVars() (+9 more)

### Community 21 - "Vis Node Plotting"
Cohesion: 0.13
Nodes (14): EvaluationResults, truncStr(), PlotLegend(), PlotLegendProps, addLineBreaks(), calcLeftPaddingForYLabels(), calcMaxCharsPerLine(), createHoverTexts() (+6 more)

### Community 22 - "EvalGen Utils"
Cohesion: 0.22
Nodes (13): executepy(), simpleQueryLLM(), ContentType, EvalGenAssertionEmitter, calculateCohensKappa(), calculateF1Score(), calculateMCC(), execPyFunc() (+5 more)

### Community 23 - "Query Pipeline"
Cohesion: 0.24
Nodes (11): LLMPrompterResults, _IntermediateLLMResponseType, PromptPipeline, yield_as_completed(), prompt_model(), ChatHistoryInfo, LLMResponseError, RawLLMResponseObject (+3 more)

### Community 24 - "Response Inspector"
Cohesion: 0.24
Nodes (18): isImageResponseData(), batchResponsesByUID(), cleanMetavarsFilterFunc(), genDebounceFunc(), groupResponsesBy(), transformDict(), escapeRegExp(), genSpansForHighlightedValue() (+10 more)

### Community 25 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 26 - "Split Node"
Cohesion: 0.19
Nodes (17): generatePrompts(), deepcopy(), deepcopy_and_modify(), dict_excluding_key(), removeLLMTagFromMetadata(), stripLLMDetailsFromResponses(), tagMetadataWithLLM(), LLMEvaluatorNode() (+9 more)

### Community 27 - "Text Fields & Items Nodes"
Cohesion: 0.22
Nodes (16): cleanEscapedBraces(), DebounceRef, processCSV(), setsAreEqual(), stripWrappingQuotes(), ItemsNode(), ItemsNodeProps, makeSafeForCSLFormat() (+8 more)

### Community 28 - "Join Node"
Cohesion: 0.18
Nodes (16): TemplateVarInfo, countNumLLMs(), extractLLMLookup(), getVarsAndMetavars(), toStandardResponseFormat(), CodeEvaluatorNode(), DEFAULT_GROUPBY_VAR_ALL, displayJoinedTexts() (+8 more)

### Community 29 - "Response Display Boxes"
Cohesion: 0.17
Nodes (15): react, EvaluationScore, blobOrFileToDataURL(), countResponsesBy(), EvalResultAssessment, FAILURE_EVAL_SCORES, genResponseTextsDisplay(), getEvalResultStr() (+7 more)

### Community 30 - "Custom Providers UI"
Cohesion: 0.16
Nodes (15): getAIFeaturesModelProviders(), initCustomProvider(), loadCachedCustomProviders(), removeCustomProvider(), CustomLLMProviderSpec, CustomProviderScriptDropzone(), CustomProviderScriptDropzoneProps, GlobalSettingsModal (+7 more)

### Community 31 - "Response Ratings"
Cohesion: 0.20
Nodes (11): RatingDict, FeedbackStep(), FeedbackStepProps, EvalResultDisplay(), collapse_ratings(), getRatingKeyForResponse(), ResponseRatingToolbar(), ResponseRatingToolbarProps (+3 more)

### Community 32 - "Model Registry"
Cohesion: 0.25
Nodes (10): extract_llm_provider(), COST_PER_REQUEST_BY_MODEL, getEnumName(), getProvider(), LLMProvider, NativeLLM, RATE_LIMIT_BY_PROVIDER, DUMMY_RESPONSE_CACHE (+2 more)

### Community 33 - "Python Provider Registry"
Cohesion: 0.23
Nodes (7): exclude_key(), initCustomProvider(), loadCachedCustomProviders(), Initalizes custom model provider(s) defined in a Python script,         and ret, Initalizes all custom model provider(s) in the local provider_scripts directory., removeCustomProvider(), _ProviderRegistry

### Community 34 - "String Interning"
Cohesion: 0.24
Nodes (5): extract_llm_nickname(), MetricType, run_over_responses(), StringLookup, GradingView()

### Community 35 - "Zustand Store"
Cohesion: 0.15
Nodes (12): colorPalettes, flattenLLMGroup(), flattenLLMProviders(), initialAPIKeys, initialFlags, initialLLMColors, IS_RUNNING_LOCALLY, llmColorPalette (+4 more)

### Community 36 - "Custom Provider Protocol"
Cohesion: 0.18
Nodes (8): A simple custom model provider to add to the ChainForge interface,     to suppo, ChatMessage, CustomProviderProtocol, provider(), A Callable protocol to implement for custom model provider completions., A single message, in OpenAI chat message format., A decorator for registering custom LLM provider methods or classes (Callables), Protocol

### Community 37 - "Flow Storage & Upload"
Cohesion: 0.17
Nodes (12): compute_file_hash(), _get_unique_flow_name(), import_flow_bundle(), Import a flow bundle (.cfzip file) that contains a flow.json and associated medi, Verifies if a media file's content hash matches the hash in its filename.     R, Save, rename, or duplicate a flow, Return a non-name-clashing filename to store in the local disk., Calculate SHA256 hash of a file-like object (does not reset pointer). (+4 more)

### Community 39 - "Simple Eval Node & Status"
Cohesion: 0.20
Nodes (10): NodeLabelProps, createJSEvalCodeFor(), Operator, OPERATORS, RESPONSE_FORMATS, ResponseFormat, SimpleEvalNode(), Status (+2 more)

### Community 40 - "Secure Settings Save"
Cohesion: 0.22
Nodes (10): get_flow(), get_settings(), Return the requested config, Save the current settings, save_settings(), generate_key(), load_json_file(), Load a JSON file. If secure is True, load the encrypted file and decrypt it usin (+2 more)

### Community 41 - "Inspector & Resize"
Cohesion: 0.24
Nodes (9): xlsx, grabResponses(), to_standard_format(), InspectorNode(), InspectorNodeProps, exportToExcel(), ResizeHandle(), ResizeHandleProps (+1 more)

### Community 42 - "Model Settings Modal"
Cohesion: 0.20
Nodes (9): JSONCompatible, ModelSettingsDict, ModelSettings, IS_RUNNING_LOCALLY, ModelSettingsModal, ModelSettingsModalProps, ModelSettingsModalRef, widgets (+1 more)

### Community 43 - "EvalGen Grading Step"
Cohesion: 0.27
Nodes (7): generateLLMEvaluationCriteria(), getPromptForGenEvalCriteriaFromDesc(), retryAsyncFunc(), CriteriaCardProps, GradingResponsesStep(), GradingResponsesStepProps, PickCriteriaStep()

### Community 44 - "Alert Modal & Sidebar"
Cohesion: 0.25
Nodes (6): ALERT_MODAL_STYLE, AlertModal, AlertModalContext, AlertModalRef, FlowFile, FlowSidebarProps

### Community 45 - "Theme & Entry Point"
Cohesion: 0.31
Nodes (6): AlertModalProvider(), ColorSchemeToggle(), ColorThemeProvider(), getOSPreferredColorScheme(), root, reportWebVitals()

### Community 46 - "Web App Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 47 - "Shared Type Aliases"
Cohesion: 0.39
Nodes (6): ResponseInfo, LLM, Dict, call_alephalpha(), call_llm(), PromptInfo

### Community 48 - "Example Flows Modal"
Cohesion: 0.29
Nodes (5): ExampleFlowCardProps, ExampleFlowsModal, ExampleFlowsModalProps, ExampleFlowsModalRef, OAIEVALS

### Community 49 - "CLI Entry Point"
Cohesion: 0.47
Nodes (4): main(), # TODO: Add this back, # TODO: Reimplement this where the React server is given the backend's port befo, run_server()

### Community 50 - "Custom Provider Calls"
Cohesion: 0.40
Nodes (4): callCustomProvider(), make_sync_call_async(), Makes a blocking synchronous call asynchronous, so that it can be awaited., Calls a custom model provider and returns the response.          POST'd data s

### Community 51 - "Prettier Config"
Cohesion: 0.40
Nodes (4): semi, singleQuote, tabWidth, trailingComma

### Community 55 - "Default Model Settings"
Cohesion: 0.67
Nodes (4): INITIAL_LLM(), getDefaultModelFormData(), getDefaultModelSettings(), postProcessFormData()

### Community 57 - "Logo 512 Image"
Cohesion: 0.67
Nodes (3): Chain Link Symbol, Chaining / Linking of Prompts and Nodes, ChainForge Logo (512px)

### Community 58 - "EvalGen Readme"
Cohesion: 0.67
Nodes (3): evalgen Executor Component, evalgen OAI Utils Component, evalgen Utils Component

## Knowledge Gaps
- **344 isolated node(s):** `trailingComma`, `tabWidth`, `semi`, `singleQuote`, `webpack` (+339 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `NPM Dependencies` to `Markdown Rendering`, `Image URL Utils`, `NPM Package Scripts`, `Inspector & Resize`, `Media Lookup Cache`, `Storage Cache`, `Response Display Boxes`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `Dict` connect `Shared Type Aliases` to `Provider API Calls`, `Media & Tabular Data Types`, `AI Assist Popover`, `Evaluator Nodes & Inspectors`, `Prompt Node & LLM Lists`, `App Shell & Menus`, `Backend Query Orchestration`, `Node Shell Components`, `Prompt Templating`, `AI Suggestions Manager`, `Model Settings Schemas`, `Media Lookup Cache`, `EvalGen Function Executor`, `Storage Cache`, `EvalGen Criteria Types`, `Uncertainty Auditor`, `Vis Node Plotting`, `EvalGen Utils`, `Query Pipeline`, `Response Inspector`, `Split Node`, `Text Fields & Items Nodes`, `Join Node`, `Response Display Boxes`, `Custom Providers UI`, `Response Ratings`, `Model Registry`, `String Interning`, `Zustand Store`, `Custom Provider Protocol`, `Model Settings Modal`, `EvalGen Grading Step`, `Alert Modal & Sidebar`, `Example Flows Modal`, `Cache Helpers`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `lz-string` connect `Storage Cache` to `NPM Dependencies`, `App Shell & Menus`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `llmResponseDataToString()` (e.g. with `LLMResponseInspector()` and `UncertaintyAuditNode()`) actually correct?**
  _`llmResponseDataToString()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `# TODO: Add this back`, `# TODO: Reimplement this where the React server is given the backend's port befo`, `A simple custom model provider to add to the ChainForge interface,     to suppo` to the rest of the system?**
  _379 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.021505376344086023 - nodes in this community are weakly interconnected._
- **Should `Provider API Calls` be split into smaller, more focused modules?**
  _Cohesion score 0.050724637681159424 - nodes in this community are weakly interconnected._