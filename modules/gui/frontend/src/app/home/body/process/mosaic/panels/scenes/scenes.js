import {initValues} from 'app/home/body/process/recipe'
import {withRecipe} from 'app/home/body/process/recipeContext'
import {selectFrom} from 'collections'
import PropTypes from 'prop-types'
import React from 'react'
import {msg} from 'translate'
import Buttons from 'widget/buttons'
import {Field, form} from 'widget/form'
import FormPanel, {FormPanelButtons} from 'widget/formPanel'
import Label from 'widget/label'
import {PanelContent, PanelHeader} from 'widget/panel'
import {RecipeActions, SceneSelectionType} from '../../mosaicRecipe'
import styles from './scenes.module.css'

const fields = {
    type: new Field()
        .notEmpty('process.mosaic.panel.scenes.form.required'),

    targetDateWeight: new Field()
}

const mapRecipeToProps = recipe => ({
    recipeId: recipe.id,
    model: selectFrom(recipe, 'model.sceneSelectionOptions'),
    values: selectFrom(recipe, 'ui.sceneSelectionOptions')
})

class Scenes extends React.Component {
    constructor(props) {
        super(props)
        this.recipeActions = RecipeActions(props.recipeId)
    }

    renderTypes() {
        const {inputs: {type}} = this.props
        const options = [
            {
                value: SceneSelectionType.ALL,
                label: msg('process.mosaic.panel.scenes.form.type.all.label')
            },
            {
                value: SceneSelectionType.SELECT,
                label: msg('process.mosaic.panel.scenes.form.type.select.label')
            },
        ]
        return (
            <div className={styles.types}>
                <Label msg={msg('process.mosaic.panel.scenes.form.type.label')}/>
                <Buttons
                    className={styles.sources}
                    input={type}
                    options={options}/>
            </div>
        )
    }

    renderTargetDateWeight() {
        const {inputs: {targetDateWeight}} = this.props
        const options = [
            {
                value: 0,
                label: msg('process.mosaic.panel.scenes.form.targetDateWeight.cloudFree.label'),
                // tooltip: msg('process.mosaic.panel.scenes.form.targetDateWeight.cloudFree.tooltip')
            },
            {
                value: 0.5,
                label: msg('process.mosaic.panel.scenes.form.targetDateWeight.balanced.label'),
                // tooltip: msg('process.mosaic.panel.scenes.form.targetDateWeight.balanced.tooltip')
            },
            {
                value: 1,
                label: msg('process.mosaic.panel.scenes.form.targetDateWeight.targetDate.label'),
                // tooltip: msg('process.mosaic.panel.scenes.form.targetDateWeight.targetDate.tooltip')
            },
        ]
        return (
            <div>
                <Label msg={msg('process.mosaic.panel.scenes.form.targetDateWeight.label')}/>
                <Buttons
                    input={targetDateWeight}
                    options={options}/>
            </div>
        )
    }

    render() {
        const {form, inputs: {type}} = this.props
        return (
            <FormPanel
                id='scenes'
                className={styles.panel}
                form={form}
                placement='bottom-right'
                onApply={values => this.recipeActions.setSceneSelectionOptions({
                    values,
                    model: valuesToModel(values)
                }).dispatch()}>
                <PanelHeader
                    icon='images'
                    title={msg('process.mosaic.panel.scenes.title')}/>

                <PanelContent>
                    <div>
                        {this.renderTypes()}
                        {type.value === SceneSelectionType.SELECT ? this.renderTargetDateWeight() : null}
                    </div>
                </PanelContent>

                <FormPanelButtons/>
            </FormPanel>
        )
    }
}

Scenes.propTypes = {
    recipeId: PropTypes.string
}

const valuesToModel = values => ({
    ...values
})

const modelToValues = model => ({
    ...model
})

export default withRecipe(mapRecipeToProps)(
    initValues({
        getModel: props => props.model,
        getValues: props => props.values,
        modelToValues,
        onInitialized: ({model, values, props}) =>
            RecipeActions(props.recipeId)
                .setSceneSelectionOptions({values, model})
                .dispatch()
    })(
        form({fields})(Scenes)
    )
)
