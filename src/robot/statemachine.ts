import { loggerFactory } from "../logging";

export type EventType = { };
export type TransitionEnterAction = (from: Handler, event: EventType) => any;
export type TransitionExitAction = (to: Handler, event: EventType) => any;

export type Handler = {
    name: string;
    enter: TransitionEnterAction;
    exit: TransitionExitAction;
}

export type Transition = {
    from: Handler,
    to: Handler,
    transition: EventType;
}

export type StateMachine<Event extends EventType> = {
    lastEvent: Event,
    currentHandler: Handler,
    transition: (event: Event) => boolean,
    createHandler: (name: string, enter: TransitionEnterAction, exit: TransitionExitAction) => Handler
    register: (from: Handler, to: Handler, event: Event) => boolean,
};

let activeStateMachines = 0;
export function createStateMachine<Event extends EventType>(initialState: Event, initialHandler: Handler): StateMachine<Event> { 
    const logger = loggerFactory(`StateMachine-${activeStateMachines++}`)
    
    // from which Handler exist which Transitions?
    const transitionMap = new Map<Handler, Transition[]>;
    let currentHandler: Handler = initialHandler;
    let hasWarnedAboutDeadend = false;

    const StateMachine = {
        lastEvent: initialState,
        currentHandler: initialHandler,
        transition: function(event: Event) {
            const transitions = transitionMap.get(this.currentHandler);
            if(!transitions || transitions.length == 0) {
                // this state has no dead end, optionally sending a warning message
                if(!hasWarnedAboutDeadend) {
                    logger.debug(`This state machine has no exit condition from '${this.currentHandler.name}'`);
                    hasWarnedAboutDeadend = true;
                }
                return false;
            }

            const transition = transitions.find(x => x.transition === event);
            if(!transition) {
                // the handler has transition, but this is not one
                return false;
            }

            const from = this.currentHandler;
            const to = transition.to;

            this.lastEvent = event;
            this.currentHandler = currentHandler;
            try {
                from.exit(to, event);
            } catch (ex) {
                logger.debug(`StateMachine transitioned to '${to.name}' via event source '${JSON.stringify(event)}' and exit handler threw ${JSON.stringify(ex)}`)
            }

            try {
                to.enter(from, event);
            } catch (ex) {
                logger.debug(`StateMachine transitioned to '${to.name}' via event source '${JSON.stringify(event)}' and enter handler threw ${JSON.stringify(ex)}`)
            }
            logger.debug(`StateMachine Transition '${from.name}' => '${to.name}' via '${JSON.stringify(event)}'`);
            return true;
        },
        createHandler: (name: string, enter: TransitionEnterAction, exit: TransitionExitAction) => ({
            name: name,
            enter: enter,
            exit: exit
        }),
        register: function(from: Handler, to: Handler, event: Event) {
            const existingTransitions = transitionMap.get(from);
            if(!existingTransitions) {
                // easy: no transitins, create from scratch
                transitionMap.set(from, [{
                    from: from,
                    to: to,
                    transition: event
                }]);
                return true;
            }
            const existingTransition = existingTransitions.find(x => x.transition === event);
            if(existingTransition) {
                // there's already a transition via the event to some handler
                logger.warn(
                    `Rejecting transition registration from '${from.name}' to '${to.name}' via '${JSON.stringify(event)}', 
                    existing transition is '${existingTransition.from}' to '${existingTransition.to}' via '${JSON.stringify(existingTransition.transition)}'`);
                return false;
            }

            // no transition via event can be safely added
            existingTransitions.push({
                from: from,
                to: to,
                transition: event
            });
            transitionMap.set(from, existingTransitions);
            return true;
        },
    } 

    // without declaring 'undefined' on enter events, this is fine
    initialHandler.enter(initialHandler, initialState);
    return StateMachine;
} 