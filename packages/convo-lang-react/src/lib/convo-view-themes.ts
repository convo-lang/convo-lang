import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { ArrowUpIcon, BrainIcon, DatabaseSearchIcon, Loader2Icon, MemoryStickIcon, MenuIcon, UserIcon, VariableIcon } from 'lucide-react';
import { mergeConvoViewThemes } from "../convo-theme-lib.js";

export type ConvoViewThemeName='default'|'default-layout'|'default-icons'|'default-style';

export const getConvoViewTheme=(name:ConvoViewThemeName):ConvoViewTheme=>{

    switch(name){

        case 'default-icons':
            return {
                userIcon:UserIcon,
                assistantIcon:BrainIcon,
                systemIcon:MemoryStickIcon,
                assignmentIcon:VariableIcon,
                loaderIcon:Loader2Icon,
                inputSubmitButtonIcon:ArrowUpIcon,
                suggestionTitleIcon:MenuIcon,
                ragIcon:DatabaseSearchIcon,
                functionIcon:VariableIcon,
            };

        case 'default-layout': return {
            convoViewClassName:'relative flex flex-col',
            iconClassName:'size-4 shrink-0 opacity-50',



            userIconClassName:'mt-2 -mr-2',
            assistantIconClassName:'mt-2 -ml-2',

            markdownClassName:'prose dark:prose-invert',
            plainTextClassName:'whitespace-pre-line',

            messageListContainerClassName:'flex flex-col flex-1',
            messageListClassName:'flex flex-col gap-4 p-4',
            messageListContainerScrollDisabledClassName:'',
            scrollViewClassName:'flex-1',
            scrollContentClassName:'',

            messageClassName:'p-3',
            userMessageClassName:'',
            assistantMessageClassName:'',
            resultMessageClassName:'',
            ragMessageClassName:'text-sm py-2 px-3 flex gap-1 items-center',
            systemMessageClassName:'text-sm whitespace-pre-line',

            callMessageClassName:'whitespace-pre-wrap',
            functionMessageClassName:'whitespace-pre-wrap',

            rowClassName:'flex items-start gap-2',
            userRowClassName:'justify-end ml-8',
            assistantRowClassName:'mr-8',
            resultRowClassName:'',
            ragRowClassName:'',
            systemRowClassName:'',
            callRowClassName:'',
            functionRowClassName:'',
            suggestionRowClassName:'',
            componentRowClassName:'',

            assignmentListClassName:'flex flex-col gap-2',
            assignmentValueClassName:'whitespace-pre-wrap',
            assignmentFunctionCallClassName:'whitespace-pre-wrap',
            assignmentWindowClassName:'line-clamp-6 overflow-clip',
            assignmentStreamingFunctionCallClassName:'flex items-center justify-between',

            imageClassName:'',
            userImageClassName:'',
            assistantImageClassName:'',

            statusIndicatorRowClassName:'',

            loaderIconClassName:'animate-spin',

            inputSuggestionsContainerClassName:'flex flex-wrap gap-2 items-center',
            inputSuggestionButtonClassName:'text-left py-1 px-2 text-sm cursor-pointer flex items-center gap-1',

            inputAreaClassName:'absolute left-0 bottom-0 right-0 flex flex-col gap-2 pl-4 pb-4 pr-4',

            inputContainerClassName:'relative flex items-center',
            inputContainerReadyClassName:'',
            inputClassName:'flex-1 py-2 pl-4 pr-8 resize-none min-h-0 max-h-80 field-sizing-content',
            inputReadyClassName:'',
            inputSubmitButtonClassName:'absolute right-1.5 size-7 flex justify-center items-center',
            inputSubmitReadyButtonClassName:'',

            inputSubmitButtonIconClassName:'',

            inputImageClassName:'',

            suggestionContainerClassName:'flex flex-col pl-6',
            suggestionMessageClassName:'flex flex-col gap-1 items-start p-0',
            suggestionTitleContainerClassName:'flex items-center gap-1 mb-1',

            suggestionTitleIconClassName:'size-3',
            suggestionTitleClassName:'text-xs',
            suggestionButtonClassName:'text-left py-1.5 pl-3 pr-4 cursor-pointer flex items-center gap-1 text-sm',

            taskClassName:'',
            taskNameClassName:'',
            taskLinkClassName:'',
            taskProgressBarClassName:'',
            taskStatusClassName:'',
            taskRowClassName:'',

            sourceViewContainerClassName:'flex-1 relative flex flex-col',
            sourceViewContainerScrollDisabledClassName:'[flex:unset]',
            sourceViewScrollViewClassName:'flex-1',
            sourceViewBusyContainer:'absolute right-4 bottom-4 pointer-events-none',
            sourceViewSubmitButtonClassName:'absolute left-[50%] bottom-2 transform-[translateX(-50%)] flex flex-col items-center p-2',
            sourceViewSubmitButtonShortcutClassName:'text-xs',

            sourceViewTextareaClassName:'[caret-color:var(--foreground)]!'
        };

        case 'default-style': return {

            messageClassName:'border rounded-xl',


            ragMessageClassName:'bg-foreground text-background',
            systemMessageClassName:'font-mono',
            functionMessageClassName:'font-mono',

            inputImageClassName:'rounded-lg',

            inputSuggestionButtonClassName:'border rounded-full flex bg-background hover:bg-foreground/30 transition-[background-color]',

            inputAreaClassName:'bg-gradient-to-t from-background/100 to-background/0 [&>*]:drop-shadow-sm',
            inputContainerReadyClassName:'border-border',
            inputClassName:'rounded-3xl outline-none border border-border bg-background focus:shadow-[0_0_3px_oklch(from_var(--primary)_l_c_h_/_0.3)] focus:border-border transition-[border-color]',
            inputReadyClassName:'',
            inputSubmitButtonClassName:
                'rounded-full bg-primary text-primary-foreground '+
                'transition-opacity opacity-50',
            inputSubmitReadyButtonClassName:'opacity-100',
            suggestionMessageClassName:'border-none',
            suggestionTitleClassName:'text-foreground/50',

            assignmentMessageClassName:'font-mono',
            suggestionButtonClassName:'border rounded-full bg-background hover:bg-foreground/30 transition-[background-color]',
            assignmentFunctionCallClassName:'border-b pb-2',
            assignmentStreamingFunctionTokenCountCallClassName:'opacity-50 text-sm',
            assignmentWindowClassName:'border rounded p-2 font-mono mt-2',

            sourceViewLineNumberClassName:'border-r',
            sourceViewErrorClassName:'color-destructive',
            sourceViewErrorMessageClassName:'color-destructive bg-destructive/30',
            sourceViewErrorHighlightMessageClassName:'bg-destructive/20',

        };

        case 'default':
        default:
            return mergeConvoViewThemes(
                getConvoViewTheme('default-layout'),'merge',
                getConvoViewTheme('default-icons'),
                getConvoViewTheme('default-style'),
            )
    }

}
