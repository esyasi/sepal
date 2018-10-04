import {Button, ButtonGroup} from 'widget/button'
import {CenteredProgress} from 'widget/progress'
import {HoldButton} from 'widget/holdButton'
import {connect, select} from 'store'
import {deleteRecipe, loadRecipe$, loadRecipes$} from './recipe'
import {map} from 'rxjs/operators'
import {msg} from 'translate'
import {recipePath} from 'app/home/body/process/recipe'
import PropTypes from 'prop-types'
import React from 'react'
import actionBuilder from 'action-builder'
import api from 'api'
import flexy from 'flexy.module.css'
import styles from './createOrLoadRecipe.module.css'

const CreateOrLoadRecipe = ({recipeId}) =>
    <div className={[styles.container, flexy.container].join(' ')}>
        <div className={styles.createButtons}>
            <ButtonGroup>
                <CreateButton label={msg('process.mosaic.create')} recipeId={recipeId} type='MOSAIC'/>
                <CreateButton label={msg('process.classification.create')} recipeId={recipeId} type='CLASSIFICATION'/>
                <CreateButton label={msg('process.changeDetection.create')} recipeId={recipeId} type='CHANGE_DETECTION'/>
                <CreateButton label={msg('process.timeSeries.create')} recipeId={recipeId} type='TIME_SERIES'/>
                <CreateButton label={msg('process.landCover.create')} recipeId={recipeId} type='LAND_COVER'/>
            </ButtonGroup>
        </div>
        <RecipeList recipeId={recipeId}/>
    </div>

CreateOrLoadRecipe.propTypes = {
    recipeId: PropTypes.string.isRequired
}

export default CreateOrLoadRecipe

const mapStateToProps = () => ({
    recipes: select('process.recipes')
})

class RecipeList extends React.Component {
    UNSAFE_componentWillMount() {
        if (!this.props.recipes)
            this.props.asyncActionBuilder('LOAD_RECIPES', loadRecipes$())
                .dispatch()
    }

    loadRecipe(recipeId) {
        this.props.asyncActionBuilder('LOAD_RECIPE', loadRecipe$(recipeId))
            .dispatch()
    }

    duplicateRecipe(recipeIdToDuplicate) {
        this.props.asyncActionBuilder('DUPLICATE_RECIPE', this.duplicateRecipe$(recipeIdToDuplicate))
            .dispatch()
    }

    duplicateRecipe$(recipeIdToDuplicate) {
        const {recipeId} = this.props
        return api.recipe.load$(recipeIdToDuplicate).pipe(
            map(recipe => ({
                ...recipe,
                id: recipeId,
                title: (recipe.title || recipe.placeholder) + '_copy'
            })
            ),
            map(duplicate =>
                actionBuilder('DUPLICATE_RECIPE', {duplicate})
                    .set(recipePath(recipeId), duplicate)
                    .build())
        )
    }

    render() {
        const {recipes, action} = this.props
        if (!recipes && !action('LOAD_RECIPES').dispatched)
            return <CenteredProgress title={msg('process.recipe.loading')}/>
        return (
            <div className={[styles.recipesTable, flexy.container].join(' ')}>
                <div className={styles.recipesHeader}>
                    <div className={styles.name}>{msg('process.recipe.name')}</div>
                    <div className={styles.type}>{msg('process.recipe.type')}</div>
                </div>
                <div className={[styles.recipeRows, flexy.scrollable].join(' ')}>
                    {(recipes || []).map((recipe) =>
                        <div key={recipe.id} className={styles.recipe} onClick={() => this.loadRecipe(recipe.id)}>
                            <div className={styles.name}>{recipe.name}</div>
                            <div className={styles.type}>{recipe.type}</div>
                            <div className={styles.duplicate}>
                                <Button
                                    look='highlight'
                                    icon='clone'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        this.duplicateRecipe(recipe.id)
                                    }}/>
                            </div>
                            <div className={styles.delete}>
                                <Button
                                    icon='trash-alt'
                                    className={styles.recipeButton}
                                    onClickHold={() => deleteRecipe(recipe.id)}
                                    stopPropagation={true}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

RecipeList = connect(mapStateToProps)(RecipeList)

const setTabType = (recipeId, type, title) =>
    actionBuilder('SET_TAB_TYPE')
        .withState('process.tabs', (recipes, stateBuilder) => {
            const recipeIndex = recipes.findIndex((recipe) => recipe.id === recipeId)
            if (recipeIndex === -1)
                throw new Error('Unable to create recipe')
            return stateBuilder
                .set(['process', 'tabs', recipeIndex, 'type'], type)
                .set(['process', 'tabs', recipeIndex, 'placeholder'], `${title}_${formatDate(new Date())}`)
        })
        .dispatch()

const CreateButton = ({recipeId, type, label}) =>
    <Button
        look='transparent'
        size='x-large'
        icon='plus-circle'
        label={label}
        onClick={() => setTabType(recipeId, type, label)}/>

function formatDate(date) {
    const pad = (value) => ('' + value).length < 2 ? '0' + value : value
    let d = new Date(date),
        month = pad(d.getMonth() + 1),
        day = pad(d.getDate()),
        year = pad(d.getFullYear()),
        hours = pad(d.getHours()),
        minutes = pad(date.getMinutes()),
        seconds = pad(date.getSeconds())
    return `${[year, month, day].join('-')}_${[hours, minutes, seconds].join('-')}`
}
