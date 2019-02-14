import PropTypes from 'prop-types'
import React from 'react'
import {Activatable} from 'widget/activation'
import {Form} from 'widget/form'
import {Panel, PanelButtons} from 'widget/panel'
import {PanelWizardContext} from './panelWizard'
import {PanelButtonContext} from './toolbar'

const PanelContext = React.createContext()

export default class FormPanel extends React.Component {
    closePanel() {
        this.deactivate()
    }

    apply() {
        const {form, onApply} = this.props
        onApply(form && form.values())
        return true
    }

    ok() {
        const {form, isActionForm} = this.props
        if (form && (isActionForm || form.isDirty())) {
            this.apply()
            this.closePanel()
        } else {
            this.cancel()
        }
    }

    cancel() {
        const {onCancel} = this.props
        onCancel && onCancel()
        this.closePanel()
    }

    renderPanel() {
        const {
            form = false, isActionForm, onApply, type = 'modal', className, children,
            placement
        } = this.props
        return (
            <PanelWizardContext>
                {({wizard, back, next, done}) => {
                    return (
                        <PanelButtonContext.Consumer>
                            {placementFromContext => (
                                <PanelContext.Provider value={{
                                    wizard,
                                    first: !back,
                                    last: !next,
                                    isActionForm: form && isActionForm,
                                    dirty: form && form.isDirty(),
                                    invalid: form && form.isInvalid(),
                                    onOk: () => this.ok(),
                                    onCancel: () => this.cancel(),
                                    onBack: () => back && this.apply() && back(),
                                    onNext: () => next && this.apply() && next(),
                                    onDone: () => done && this.apply() && done()
                                }}>
                                    <Panel
                                        id={this.props.id}
                                        className={className}
                                        type={placement || placementFromContext || type}>
                                        <Form onSubmit={() => onApply && onApply(form && form.values())}>
                                            {children}
                                        </Form>
                                    </Panel>
                                </PanelContext.Provider>
                            )}
                        </PanelButtonContext.Consumer>
                    )
                }}
            </PanelWizardContext>
        )
    }

    defaultPolicy() {
        const {form} = this.props
        const dirtyPolicy = {compatibleWith: {include: []}}
        const cleanPolicy = {deactivateWhen: {exclude: []}}
        return () => form.isDirty() ? dirtyPolicy : cleanPolicy
    }

    render() {
        const {id, policy} = this.props
        return (
            <Activatable id={id} policy={policy || this.defaultPolicy()}>
                {({deactivate}) => {
                    this.deactivate = deactivate
                    return this.renderPanel()
                }}
            </Activatable>
        )
    }
}

FormPanel.propTypes = {
    children: PropTypes.any.isRequired,
    id: PropTypes.string.isRequired,
    form: PropTypes.object.isRequired,
    policy: PropTypes.func,
    className: PropTypes.string,
    isActionForm: PropTypes.any,
    type: PropTypes.string,
    placement: PropTypes.oneOf(['modal', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'center', 'inline']), // TODO: Same as type?
    onApply: PropTypes.func,
    onCancel: PropTypes.func,
}

export class FormPanelButtons extends React.Component {
    renderWizardButtons({invalid, first, last, onBack, onNext, onDone}) {
        return (
            <PanelButtons.Main>
                <PanelButtons.Back
                    shown={!first}
                    onClick={onBack}/>
                <PanelButtons.Done
                    shown={last}
                    disabled={invalid}
                    onClick={onDone}/>
                <PanelButtons.Next
                    shown={!last}
                    disabled={invalid}
                    onClick={onNext}/>
            </PanelButtons.Main>
        )
    }

    renderFormButtons({isActionForm, dirty, invalid, onOk, onCancel}) {
        const {applyLabel} = this.props
        const canSubmit = isActionForm || dirty
        return (
            <PanelButtons.Main>
                <PanelButtons.Cancel
                    shown={canSubmit}
                    onClick={onCancel}/>
                <PanelButtons.Apply
                    type={'submit'}
                    label={applyLabel}
                    shown={canSubmit}
                    disabled={invalid}
                    onClick={onOk}/>
                <PanelButtons.Close
                    type={'submit'}
                    label={applyLabel}
                    shown={!canSubmit}
                    onClick={onOk}/>
            </PanelButtons.Main>
        )
    }

    renderMainButtons({isActionForm, wizard, first, last, dirty, invalid, onOk, onCancel, onBack, onNext, onDone}) {
        return wizard
            ? this.renderWizardButtons({first, last, invalid, onBack, onNext, onDone})
            : this.renderFormButtons({isActionForm, dirty, invalid, onOk, onCancel})
    }

    renderExtraButtons() {
        const {children} = this.props
        return children ? (
            <PanelButtons.Extra>
                {children}
            </PanelButtons.Extra>
        ) : null
    }

    render() {
        return (
            <PanelContext.Consumer>
                {props => (
                    <PanelButtons>
                        {this.renderMainButtons(props)}
                        {this.renderExtraButtons()}
                    </PanelButtons>
                )}
            </PanelContext.Consumer>
        )
    }
}

FormPanelButtons.propTypes = {
    applyLabel: PropTypes.string,
    children: PropTypes.any
}
