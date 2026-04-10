import { ConvoIconType } from "./convo-lang-ui-types.js";

/**
 * The ConvoViewTheme interface defines the class names used by the ConvoView component.
 */
export interface ConvoViewTheme
{
    /**
     * Applied to all icons
     */
    iconClassName?:string;

    /**
     * Applied to all buttons that display an icon
     */
    iconButtonClassName?:string;

    /**
     * Class name give to the root ConvoView element
     */
    convoViewClassName?:string;

    userIcon?:ConvoIconType;
    assistantIcon?:ConvoIconType;
    userIconClassName?:string;
    assistantIconClassName?:string;
    systemIcon?:ConvoIconType;
    systemIconClassName?:string;

    markdownClassName?:string;
    /**
     * Applied to messages formatted in plain text
     */
    plainTextClassName?:string;

    // ------- Messages ------- //

    /**
     * Class name give to all message bubbles and custom components.
     */
    messageClassName?:string;
    userMessageClassName?:string;
    assistantMessageClassName?:string;
    resultMessageClassName?:string;
    ragMessageClassName?:string;
    systemMessageClassName?:string;
    callMessageClassName?:string;
    functionMessageClassName?:string;
    functionIcon?:ConvoIconType;
    functionIconClassName?:string;
    suggestionMessageClassName?:string;


    // ------- Message Rows ------- //

    /**
     * Class name give to all message rows. Additional row class names will be given based on the
     * message role. Each message is rendered in its own row inside a stacking column of other
     * message rows. Each message row will contain a message bubble or custom component.
     */
    rowClassName?:string;

    userRowClassName?:string;
    assistantRowClassName?:string;
    resultRowClassName?:string;
    ragRowClassName?:string;
    systemRowClassName?:string;
    callRowClassName?:string;
    functionRowClassName?:string;
    suggestionRowClassName?:string;
    componentRowClassName?:string;

    assignmentMessageClassName?:string;
    assignmentListClassName?:string;
    assignmentFunctionCallClassName?:string;
    assignmentStreamingFunctionCallClassName?:string;
    assignmentStreamingFunctionTokenCountCallClassName?:string;
    assignmentValueClassName?:string;
    assignmentIconClassName?:string;
    assignmentIcon?:ConvoIconType;
    assignmentWindowClassName?:string;

    imageClassName?:string;
    userImageClassName?:string;
    assistantImageClassName?:string;

    /**
     * Class name of container that display suggestions inline with messages. The container is
     * is rendered in a message row.
     */
    suggestionContainerClassName?:string;
    suggestionTitleClassName?:string;
    suggestionTitleContainerClassName?:string;
    suggestionTitleIcon?:ConvoIconType;
    suggestionTitleIconClassName?:string;
    suggestionButtonClassName?:string;
    suggestionButtonIcon?:ConvoIconType;
    suggestionButtonEndIcon?:ConvoIconType;
    suggestionButtonIconClassName?:string;

    // ------- Message List ------- //

    /**
     * Class name of the container element that contains the messages of the conversation
     */
    messageListContainerClassName?:string;

    /**
     * Class name of the element that contains all the message rows or contains the scroll view
     * that contains all the messages if scrolling is not disabled.
     */
    messageListClassName?:string;
    /**
     * Additional class name given with messageListClassName when scrolling is disabled.
     */
    messageListContainerScrollDisabledClassName?:string;

    /**
     * Class name of the scroll view that contains the message rows.
     */
    scrollViewClassName?:string;

    /**
     * Class name of the element that directly contains the message rows inside the scroll view the
     * moves up and down when scrolling.
     */
    scrollContentClassName?:string;

    /**
     * Class name give to the message row containing the status / loading indicator when while
     * waiting on responses.
     */
    statusIndicatorRowClassName?:string;


    // ------- Loader ------- //

    /**
     * Icon used as a loading indicator
     */
    loaderIcon?:ConvoIconType;

    /**
     * Class name given the the loader icon.
     */
    loaderIconClassName?:string;


    // ------- Input Suggestions ------- //

    /**
     * Class name give to each suggestion displayed above or below the chat text input. These
     * buttons are often styled as pills.
     */
    inputSuggestionButtonClassName?:string;



    // ------- Input ------- //
    inputContainerClassName?:string;
    inputClassName?:string;
    inputClassWrapperName?:string;
    inputReadyClassName?:string;
    inputContainerReadyClassName?:string;
    inputMainContentClassName?:string;
    inputSubmitButtonClassName?:string;
    inputSubmitReadyButtonClassName?:string;
    inputSubmitButtonIcon?:ConvoIconType;
    inputSubmitButtonIconClassName?:string;
    inputImageContainerClassName?:string;
    inputImageClassName?:string;
    inputImageRemoveButton?:string;
    inputImageRemoveButtonIcon?:ConvoIconType;
    inputImageRemoveButtonIconClassName?:string;
    inputAudioRecorderButtonClassName?:string;
    inputAudioRecorderCancelButtonClassName?:string;
    inputAudioRecorderButtonIcon?:ConvoIconType;
    inputAudioRecorderButtonIconClassName?:string;
    inputAudioRecorderSubmitButtonIcon?:ConvoIconType;
    inputAudioRecorderSubmitButtonIconClassName?:string;
    inputAudioRecorderCancelButtonIcon?:ConvoIconType;
    inputAudioRecorderCancelButtonIconClassName?:string;
    inputRecordingVisualizerCanvasClassName?:string;
    inputMessageContainerClassName?:string;
    inputTranscribeIcon?:ConvoIconType;
    inputTranscribeIconClassName?:string;


    inputAttachmentEnabledClassName?:string;
    inputAttachmentsContainer?:string;
    inputContainerAttachmentEnabledClassName?:string;
    inputAttachmentButton?:string;
    inputAttachmentButtonIcon?:ConvoIconType;
    inputAttachmentButtonIconClassName?:string;
    inputAttachmentInputOverlay?:string;

    beforeInputContainerClassName?:string;
    afterInputContainerClassName?:string;

    // ------- modelSelector ------- //
    modelSelectorClassName?:string;

    /**
     * Class name give to the container that contains the input and any other related ui including
     * input suggestions.
     */
    inputAreaClassName?:string;

    // ------- Task ------- //
    taskClassName?:string;
    taskNameClassName?:string;
    taskLinkClassName?:string;
    taskProgressBarClassName?:string;
    taskStatusClassName?:string;
    taskRowClassName?:string;


    // ------- Rag ------- //
    ragIcon?:ConvoIconType;
    ragIconClassName?:string;


    // ------- Source View ------- //
    sourceViewContainerClassName?:string;
    sourceViewContainerScrollDisabledClassName?:string;
    sourceViewScrollViewClassName?:string;
    sourceViewBusyContainer?:string;
    sourceViewSubmitButtonClassName?:string;
    sourceViewSubmitButtonShortcutClassName?:string;
    sourceViewClassName?:string;
    sourceViewTextareaClassName?:string;
    sourceViewErrorClassName?:string;
    sourceViewErrorMessageClassName?:string;
    sourceViewErrorHighlightMessageClassName?:string;
    sourceViewLineNumberClassName?:string;

}
