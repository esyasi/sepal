import {Subject} from 'rxjs'
import {connect as connectToRedux} from 'react-redux'
import {isMobile} from 'widget/userAgent'
import {takeUntil} from 'rxjs/operators'
import {selectFrom} from 'collections'
import PropTypes from 'prop-types'
import React, {Component} from 'react'
import _ from 'lodash'
import actionBuilder from 'action-builder'
import asyncActionBuilder from 'async-action-builder'
import guid from 'guid'

let storeInstance = null
const storeInitListeners = []

export function initStore(store) {
    storeInstance = store
    storeInitListeners.forEach(listener => listener(store))
}

export function subscribe(path, listener) {
    const subscribe = () => storeInstance.subscribe(() => listener(select(path)))
    if (storeInstance)
        subscribe()
    else
        storeInitListeners.push(subscribe)
}

export function state() {
    return storeInstance.getState() || {}
}

export function dispatch(action) {
    storeInstance.dispatch(action)
}

export function select(path) {
    return selectFrom(state(), path)
}

function includeDispatchingProp(id, mapStateToProps) {
    return (state, ownProps) => {
        return {
            ...mapStateToProps(state, ownProps),
            actions: state.actions || {},
            streams: state.stream && state.stream[id]
        }
    }
}

export function connect(mapStateToProps) {
    mapStateToProps = mapStateToProps ? mapStateToProps : () => ({})

    return WrappedComponent => {
        const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'
        const id = `${displayName}:${guid()}`

        class PreventUpdateWhenDisabled extends Component {
            shouldComponentUpdate(nextProps) {
                return nextProps.enabled !== false
            }

            render() {
                return (
                    <WrappedComponent {...this.props}>
                        {this.props.children}
                    </WrappedComponent>
                )
            }
        }

        class AddEnabledProp extends Component {
            render() {
                return (
                    <EnabledContext.Consumer>
                        {enabled =>
                            <ConnectedComponent {...this.props} enabled={enabled}>
                                {this.props.children}
                            </ConnectedComponent>
                        }
                    </EnabledContext.Consumer>
                )
            }
        }

        const ReduxConnectedComponent = connectToRedux(
            includeDispatchingProp(id, mapStateToProps), null, null, {
                areStatePropsEqual: (props1, props2) =>
                    _.difference(Object.keys(props1), Object.keys(props2)).length === 0 &&
                    _.isEqual(
                        _.pickBy(props1, o => !_.isFunction(o)),
                        _.pickBy(props2, o => !_.isFunction(o))
                    )
            }
        )(PreventUpdateWhenDisabled)

        class ConnectedComponent extends React.PureComponent {
            constructor(props) {
                super(props)
                this.id = id
                this.componentWillUnmount$ = new Subject()
                this.asyncActionBuilder = this.asyncActionBuilder.bind(this)
                this.action = this.action.bind(this)
                this.setDisableListener = this.setDisableListener.bind(this)
                this.setEnableListener = this.setEnableListener.bind(this)
                this.stream = stream(this)
            }

            componentWillUnmount() {
                this.componentWillUnmount$.next()
                this.componentWillUnmount$.complete()
            }

            asyncActionBuilder(type, action$) {
                return asyncActionBuilder(type, action$, this)
            }

            action(type) {
                const actions = select('actions') || {}
                const componentActions = actions[this.id] || {}
                const undispatched = !componentActions[type]
                const dispatching = componentActions[type] === 'DISPATCHING'
                const completed = componentActions[type] === 'COMPLETED'
                const failed = componentActions[type] === 'FAILED'
                const dispatched = completed || failed
                return {undispatched, dispatching, completed, failed, dispatched}
            }

            setDisableListener(listener) {
                this.onDisable = listener
            }

            setEnableListener(listener) {
                this.onEnable = listener
            }

            render() {
                return React.createElement(ReduxConnectedComponent, {
                    ...this.props,
                    asyncActionBuilder: this.asyncActionBuilder,
                    action: this.action,
                    stream: this.stream,
                    onEnable: this.setEnableListener,
                    onDisable: this.setDisableListener,
                    componentId: this.id,
                    componentWillUnmount$: this.componentWillUnmount$
                })
            }

            componentDidUpdate(prevProps) {
                const wasEnabled = prevProps.enabled
                const isEnabled = this.props.enabled
                if (this.onEnable && wasEnabled !== true && isEnabled === true) {
                    this.onEnable()
                } else if (this.onDisable && wasEnabled !== false && isEnabled === false) {
                    this.onDisable()
                }
            }
        }

        ConnectedComponent.displayName
            = AddEnabledProp.displayName
            = PreventUpdateWhenDisabled.displayName
            = `Store(${WrappedComponent.displayName})`

        return AddEnabledProp
    }
}

export function dispatchable(action) {
    return {
        ...action,
        dispatch: () => dispatch(action)
    }
}

const EnabledContext = React.createContext()

export class Enabled extends React.PureComponent {
    render() {
        const {value, children} = this.props
        return (
            <EnabledContext.Provider value={!!value}>
                {children}
            </EnabledContext.Provider>
        )
    }

    componentDidUpdate(prevProps) {
        const prevValue = prevProps.value
        const value = this.props.value
        if (!value && value !== prevValue && document.activeElement && isMobile()) {
            document.activeElement && document.activeElement.blur()
        }

    }
}

Enabled.propTypes = {
    children: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired
}

const stream = component => {
    return (name, stream$, onSuccess, onError, onComplete) => {
        const componentPath = `stream.${component.id}`
        const statePath = `${componentPath}.${name}`
        if (!stream$)
            return select(statePath)

        const setStatus = status =>
            actionBuilder('SET_STREAM_STATUS', {statePath, status})
                .set(statePath, status)
                .dispatch()

        setStatus('ACTIVE')

        let unmounted = false
        component.componentWillUnmount$.subscribe(() => {
            unmounted = true
            select(componentPath) && actionBuilder('REMOVE_STREAM_STATUS', {componentPath, name})
                .del(componentPath)
                .dispatch()
        })

        stream$
            .pipe(
                takeUntil(component.componentWillUnmount$)
            ).subscribe(
                next => {
                    onSuccess && onSuccess(next)
                },
                error => {
                    unmounted || setStatus('FAILED')
                    if (onError) {
                        onError(error)
                    } else {
                        throw error
                    }
                },
                () => {
                    unmounted || setStatus('COMPLETED')
                    onComplete && onComplete()
                }
            )
    }
}
