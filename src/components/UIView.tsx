import {Component, PropTypes, ValidationMap, createElement, isValidElement} from 'react';
import {ActiveUIView, ViewContext, ViewConfig, Transition, ResolveContext, applyPairs} from "ui-router-core";
import UIRouterReact from "../index";
import {ReactViewConfig} from "../ui-router-react";

let id = 0;

export interface UIViewAddress {
    context: ViewContext;
    fqn: string;
}

export interface IProps {
    name?: string;
}

export interface IState {
    id?: number;
    loaded?: boolean;
    component?: string;
    props?: any;
}

export class UIView extends Component<IProps, IState> {
    // This object contains all the metadata for this UIView
    uiViewData: ActiveUIView;

    // This object contains only the state context which created this <UIView/> component
    // and the UIView's fully qualified name. This object is made available to children via `context`
    uiViewAddress: UIViewAddress;

    // Deregisters the UIView when it is unmounted
    deregister: Function;

    state: IState = {
        loaded: false,
        component: 'div',
        props: {}
    }

    static childContextTypes: ValidationMap<any> = {
        parentUIViewAddress: PropTypes.object
    }

    static contextTypes: ValidationMap<any> = {
        parentUIViewAddress: PropTypes.object
    }

    render() {
        let { children } = this.props;
        let { component, props, loaded } = this.state;
        let child = !loaded && isValidElement(children)
            ? children
            : createElement(component, props);
        return child;
    }

    getChildContext() {
        return {
            parentUIViewAddress: this.uiViewAddress
        }
    }

    componentWillMount() {
        let router = UIRouterReact.instance;

        // Check the context for the parent UIView's fqn and State
        let parent: UIViewAddress = this.context['parentUIViewAddress'];
        // Not found in context, this is a root UIView
        parent = parent || { fqn: "", context: router.stateRegistry.root() };

        let name = this.props.name || "$default";

        this.uiViewData = {
            $type: 'react',
            id: ++id,
            name: name,
            fqn: parent.fqn ? parent.fqn + "." + name : name,
            creationContext: parent.context,
            configUpdated: this.viewConfigUpdated.bind(this),
            config: undefined
        } as ActiveUIView;

        this.uiViewAddress = { fqn: this.uiViewData.fqn, context: undefined };

        this.deregister = router.viewService.registerUIView(this.uiViewData);

        this.setState({ id: this.uiViewData.id });
    }

    componentWillUnmount() {
        this.deregister();
    }

    viewConfigUpdated(newConfig: ReactViewConfig) {
        let newComponent = newConfig && newConfig.viewDecl && newConfig.viewDecl.component;
        let trans: Transition = undefined, resolves = {};

        if (newConfig) {
            let context: ViewContext = newConfig.viewDecl && newConfig.viewDecl.$context;
            this.uiViewAddress = { fqn: this.uiViewAddress.fqn, context };

            let ctx = new ResolveContext(newConfig.path);
            trans = ctx.getResolvable(Transition).data;
            let stringTokens = trans.getResolveTokens().filter(x => typeof x === 'string');
            resolves = stringTokens.map(token => [token, trans.getResolveValue(token)]).reduce(applyPairs, {});
        }

        this.uiViewData.config = newConfig;
        let props = {resolves: resolves, transition: trans};
        this.setState({ component: newComponent || 'div', props: newComponent ? props : {}, loaded: newComponent ? true : false })
    }
}