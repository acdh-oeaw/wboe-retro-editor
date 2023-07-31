import { remote } from 'electron'
// import fPath from 'path'
const fs = remote.require('fs')
const { dialog } = remote
const Store = require('electron-store')
const store = new Store()

const state = {
	projectPath: null,
	show: {},
	options: {},
	lastFile: null
}

const mutations = {
	SET_PROJECT_PATH: (state, { projectPath }) => {		// Aktuellen Projektpfad setzen
		state.projectPath = projectPath
	},
	SET_SHOW: (state, { show }) => {
		state.show = show
	},
	SET_OPTIONS: (state, { options }) => {
		state.options = options
	},
	SET_LASTFILE: (state, { filename }) => {
		state.lastFile = filename
	}
}

const actions = {
	GET_LASTFILE ({ commit }) {
		commit('SET_LASTFILE', { 'filename': store.get('lastFilename', null) })
	},
	SET_LASTFILE ({ commit }, filename) {
		store.set('lastFilename', filename)
		commit('SET_LASTFILE', { 'filename': filename })
	},
	GET_SHOW ({ commit }) {
		commit('SET_SHOW', { 'show': store.get('show', { 'professional': true, 'warnings': true }) })
	},
	TOGGLE_SHOW ({ commit }, obj) {
		var aShow = JSON.parse(JSON.stringify(state.show))
		aShow[obj] = !aShow[obj]
		store.set('show', aShow)
		commit('SET_SHOW', { 'show': aShow })
	},
	GET_OPTIONS ({ commit }) {
		let aOptions = store.get('options', { 'zoom': 1, 'lineHeight': 1.5 })
		if (!aOptions.lineHeight) {
			aOptions.lineHeight = 1.5
		}
		if (!(aOptions.addBtnHover || aOptions.addBtnHover === false)) {
			aOptions.addBtnHover = true
		}
		commit('SET_OPTIONS', { 'options': aOptions })
	},
	SET_OPTIONS ({ commit }, { option, value }) {
		var aOptions = JSON.parse(JSON.stringify(state.options))
		aOptions[option] = value
		store.set('options', aOptions)
		commit('SET_OPTIONS', { 'options': aOptions })
	},
	GET_PROJECT_PATH ({ commit, dispatch }) {		// Aktuellen Projektpfad aus den "store" laden
		commit('SET_PROJECT_PATH', { 'projectPath': store.get('projectPath', remote.app.getPath('userData')) })
	},
	SET_PROJECT_PATH ({ commit, dispatch }) {		// Aktuellen Projektpfad neu setzen und in den "store" speichern
		store.set('projectPath', state.projectPath)
	},
	DIALOG_PROJECT_PATH ({ commit, dispatch }) {		// Dialog zur Auswahl einens neuen Projektpfads öffnen
		var newFolder = dialog.showOpenDialog({
			title: 'Projekt Verzeichniss auswählen',
			defaultPath: state.projectPath,
			properties: ['openDirectory']
		})
		if (!newFolder) return
		var folderState = fs.statSync(newFolder[0])
		if (folderState && folderState.isDirectory) {
			if (folderState.isDirectory()) {
				commit('SET_PROJECT_PATH', { 'projectPath': newFolder[0] })
			} else {
				alert('Auswahl ist kein Verzeichniss!', 'Fehler!')
			}
		} else {
			alert('Fehler beim auswählen des Verzeichnisses!\n\n' + JSON.stringify(folderState), 'Fehler!')
		}
	},
}

export default {
	state,
	mutations,
	actions
}
