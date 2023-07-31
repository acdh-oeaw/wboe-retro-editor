<template>
  <div class="start-page mib50">
    <div class="container">
      <br>
      <b-alert show variant="danger" v-if="Object.keys(filesystem.errors).length > 0">
        <ul class="my-0">
          <li v-for="(err, i) in filesystem.errors" :key="'e' + i"><b>{{ i }}:</b> {{ err }}</li>
        </ul>
      </b-alert>
      <div class="project-path" v-if="Options.projectPath">
        <font-awesome-icon icon="project-diagram" class="mir10" style="float:left;" />
        <p>
          <!-- Projektpfad -->
          <button @click="updateFolder" title="Projektpfad neu laden" class="fx-btn" :disabled="changed"><font-awesome-icon icon="sync-alt" class="mil5 mir5"/></button>
          <button @click="showFolder" title="Ordner in Explorer öffnen" class="fx-btn" :disabled="changed"><font-awesome-icon icon="external-link-alt" class="mil5 mir5"/></button>
          <button @click="selectFolder" title="Verzeichniss ändern" class="fx-btn" :disabled="changed"><font-awesome-icon icon="edit" class="mil5 mir5"/></button>
          {{ Options.projectPath }}
        </p>
        <div class="mb-3">
          <b-button-toolbar class="main-toolbar">
            <b-input-group class="pr-3 mw33p">
              <b-form-select v-model="filesystem.selFile" :options="filesystem.files" :disabled="changed"></b-form-select>
              <!-- <b-input-group-append><b-btn variant="primary" :disabled="!filesystem.selFile"><font-awesome-icon icon="info" /></b-btn></b-input-group-append> -->
            </b-input-group>
            <b-input-group class="pr-3 mw33p">
              <b-form-select v-model="filesystem.selEntry" :options="filesystem.entry" :disabled="!filesystem.selFile || changed"></b-form-select>
              <!-- <b-input-group-append><b-btn variant="primary" :disabled="!(filesystem.selEntry > -1)"><font-awesome-icon icon="info" /></b-btn></b-input-group-append> -->
            </b-input-group>
            <b-input-group class="pr-3 mw33p">
              <b-btn @click="save" variant="primary" :disabled="!changed">Speichern</b-btn>
            </b-input-group>
          </b-button-toolbar>
        </div>
        <div>
          <div id="editor" style="min-height: 500px; border: 1px solid #aaa;" class="h100" autofocus></div>
        </div>
      </div>
      <b-alert show variant="danger" v-else>Projektpfad nicht vergeben!</b-alert>
      <div id="loading" v-if="loading">Lade ...</div>
    </div>
  </div>
</template>

<script>
  // import { nextTick } from 'process'
  // import _ from 'lodash'
  import { mapState } from 'vuex'
  // import fPath from 'path'
  const sax = require('sax')
  sax.MAX_BUFFER_LENGTH = 128 * 1024

  const { shell, remote } = require('electron')
  const fs = remote.require('fs')

  export default {
    name: 'start-page',
    data () {
      return {
        loading: false,
        filter: '',
        filesystem: {
          selFile: null,
          files: [{ value: null, text: 'Datei auswählen ...' }],
          fileData: {
            content: '',
            header: '',
            entries: []
          },
          selEntry: -1,
          entry: [{ value: -1, text: 'Eintrag auswählen ...' }],
          errors: {}
        },
        content: '',
        orgContent: '',
        selection: {},
        monaco: {},
        editor: {},
        editorModel: null,
        orgModel: null
      }
    },
    mounted () {
      this.updateFolder()
      this.$nextTick(() => {
        loadMonacoEditor(this)
      })
    },
    computed: {
      ...mapState(['Options']),
      ...mapState(['Files']),
      changed () {
        return this.filesystem.selEntry > -1 && this.filesystem.fileData.entries[this.filesystem.selEntry] && this.content !== this.orgContent
      }
    },
    methods: {
      save () {
        if (this.filesystem.selEntry > -1 && this.filesystem.fileData.entries[this.filesystem.selEntry] && this.content !== this.orgContent) {
          let entry = this.filesystem.fileData.entries[this.filesystem.selEntry]
          let newFileContent = this.filesystem.fileData.content.slice(0, entry.pos.start) + this.content + this.filesystem.fileData.content.slice(entry.pos.end)
          let aFile = this.Options.projectPath + '\\' + this.filesystem.selFile
          console.log('Speichern ...', entry, entry.pos.start, entry.pos.end, [aFile, newFileContent])
          this.filesystem.errors = {}
          if (this.checkXMLData(this.content)) {
            if (this.checkXMLData(newFileContent)) {
              try {
                fs.writeFileSync(aFile, newFileContent, 'utf8')
                let oldSelEntry = this.filesystem.selEntry
                this.updateSelFile()
                this.filesystem.selEntry = oldSelEntry
                this.updateSelEntry()
              } catch (e) {
                console.log(e)
                alert('Beim speichern kam es zu einem Fehler!\nDatei NICHT gespeichert!')
              }
            } else {
              alert('Datei konnte nicht gespeichert werden!')
            }
          } else {
            alert('Datei konnte nicht gespeichert werden!')
          }
        }
      },
      selectFolder () {		// Projektpfad auswählen und speichern
        this.loading = true
        this.$store.dispatch('DIALOG_PROJECT_PATH')	// Verzeichniss Dialog
        this.$store.dispatch('SET_PROJECT_PATH')		// Projektpfad speichern
        this.loading = false
        this.updateFolder()
      },
      showFolder () {		// Ordner in Explorer öffnen
        shell.openItem(this.Options.projectPath)
      },
      updateFolder () {		// Projektpfad neu laden
        this.loading = true
        console.log('updateFolder', this.filesystem)
        let oldSelFile = this.filesystem.selFile
        let oldSelEntry = this.filesystem.selEntry
        this.filesystem.selFile = null
        this.filesystem.files = [{ value: null, text: 'Datei auswählen ...' }]
        this.filesystem.fileData.content = ''
        this.filesystem.fileData.header = ''
        this.filesystem.fileData.entries = []
        this.filesystem.selEntry = -1
        this.filesystem.entry = [{ value: -1, text: 'Eintrag auswählen ...' }]
        this.filesystem.errors = {}
        if (!fs.existsSync(this.Options.projectPath)) {
          this.filesystem.errors.projectPath = '"' + this.Options.projectPath + '" existiert nicht!'
        } else {
          let files = fs.readdirSync(this.Options.projectPath)
          files.sort().forEach(f => {
            this.filesystem.files.push({ value: f, text: f })
          })
          if (oldSelFile) {
            let sameFile = false
            this.filesystem.files.forEach(f => {
              if (f.value === oldSelFile) {
                sameFile = true
              }
            })
            if (sameFile) {
              this.filesystem.selFile = oldSelFile
              this.updateSelFile()
              this.filesystem.selEntry = oldSelEntry
            }
          }
        }
        this.loading = false
      },
      checkXMLData (xml) {
        let parser = sax.parser(true, {
          lowercase: true,
          position: true
        })
        let errDg = 0
        parser.onerror = (e) => {
          console.log('checkXMLData - saxes error:', e)
          this.filesystem.errors['XMLError' + errDg] = 'XML Fehler!\n' + e.message
          errDg += 1
        }
        parser.onend = () => {
          console.log('checkXMLData - parser.onend', this.filesystem.fileData)
        }
        parser.write(xml).close()
        console.log('checkXMLData - Fertig', errDg)
        return errDg === 0
      },
      updateSelFile () {
        this.filesystem.entry = [{ value: -1, text: 'Eintrag auswählen ...' }]
        this.filesystem.fileData.content = ''
        this.filesystem.fileData.header = ''
        this.filesystem.fileData.entries = []
        this.filesystem.selEntry = -1
        this.filesystem.errors = {}
        if (this.filesystem.selFile) {
          let aFile = this.Options.projectPath + '\\' + this.filesystem.selFile
          if (fs.existsSync(aFile)) {
            this.filesystem.fileData.content = fs.readFileSync(aFile, 'utf8')
            console.log('file', {content: this.filesystem.fileData.content})
            let parser = sax.parser(true, {
              lowercase: true,
              position: true
            })
            let errDg = 0
            let eDg = 0
            let ePos = -1
            let hPos = -1
            let lemmaId = null
            parser.onerror = (e) => {
              console.log('saxes error:', e)
              this.filesystem.errors['XMLError' + errDg] = 'XML Fehler!\n' + e.message
              errDg += 1
            }
            parser.onopentag = (node) => {
              if (node.name === 'entry') {
                ePos = parser.startTagPosition - 1
              }
              if (node.name === 'teiHeader') {
                hPos = parser.startTagPosition - 1
              }
              if (node.name === 'form' && node.attributes && node.attributes.type && node.attributes.type === 'lemma' && node.attributes['xml:id']) {
                lemmaId = node.attributes['xml:id'].trim()
              }
            }
            parser.ontext = (txt) => {
            }
            parser.onclosetag = (tag) => {
              if (tag === 'entry') {
                let aTitle = (lemmaId || 'Unbekannt!').trim()
                this.filesystem.fileData.entries.push({
                  nr: eDg,
                  title: aTitle,
                  content: this.filesystem.fileData.content.slice(ePos, parser.position),
                  pos: {
                    start: ePos,
                    end: parser.position
                  }
                })
                this.filesystem.entry.push({ value: eDg, text: aTitle })
                lemmaId = null
                eDg += 1
              }
              if (tag === 'teiHeader') {
                this.filesystem.fileData.header = this.filesystem.fileData.content.slice(hPos, parser.position)
              }
            }
            parser.onprocessinginstruction = (node) => {
            }
            parser.onend = () => {
              console.log('parser.onend', this.filesystem.fileData)
            }
            parser.write(this.filesystem.fileData.content).close()
          } else {
            this.filesystem.errors.missingFiles = '"' + aFile + '" existiert nicht!'
          }
        }
        console.log('updateSelFile', this.filesystem.fileData)
      },
      updateSelEntry () {
        if (this.filesystem.selEntry > -1 && this.filesystem.fileData.entries[this.filesystem.selEntry] && this.filesystem.fileData.entries[this.filesystem.selEntry].content) {
          this.content = this.filesystem.fileData.entries[this.filesystem.selEntry].content
          this.orgContent = this.content
        } else {
          this.content = ''
          this.orgContent = ''
        }
        this.editorModel.setValue(this.content)
        if (this.Options.show.monacoDiff) {
          this.orgModel.setValue(this.orgContent)
          this.editor.setModel({'original': this.orgModel, 'modified': this.editorModel})
        } else {
          this.editor.setModel(this.editorModel)
        }
      }
    },
    watch: {
      'filesystem.selFile' () {
        this.updateSelFile()
      },
      'Options.projectPath' (nVal) {
        if (nVal) {		// Wenn sich der Projektpfad ändert alle Verzeichnisse zurücksetzen
          this.loading = true
          this.updateFolder()
          this.loading = false
        }
      },
      'filesystem.selEntry' () {
        this.updateSelEntry()
      }
    },
    components: {
    }
  }

  function requireMonacoEditor (amdRequire, thisEditor) {
    var path = require('path')
    function uriFromPath (_path) {
      // console.log('uriFromPath', [_path, path.resolve(_path)])
      var pathName = path.resolve(_path).replace(/\\/g, '/')
      if (pathName.length > 0 && pathName.charAt(0) !== '/') {
        pathName = '/' + pathName
      }
      return encodeURI('file://' + pathName)
    }
    amdRequire.config({
      baseUrl: uriFromPath(path.join(__dirname, ((process.env.NODE_ENV === 'development') ? '../../' : '../') + '../node_modules/monaco-editor/dev'))
    })
    self.module = null
    self.process.browser = true
    amdRequire(['vs/editor/editor.main'], function () {
      thisEditor.monaco = this.monaco
      thisEditor.monaco.languages.html.htmlDefaults.options.format.tabSize = 2
      const editorContainer = document.getElementById('editor')
      const editorOptions = {
        language: 'xml',
        autoIndent: true,
        wrappingIndent: 'same',
        showFoldingControls: 'always',
        multiCursorModifier: 'ctrlCmd',
        tabSize: 2
      }
      if (thisEditor.Options.show.monacoDiff) {
        thisEditor.editor = this.monaco.editor.createDiffEditor(editorContainer, editorOptions)
      } else {
        thisEditor.editor = this.monaco.editor.create(editorContainer, editorOptions)
      }
      function updateDimensions () {
        thisEditor.editor.layout()
      }
      window.addEventListener('resize', updateDimensions)
      editorContainer.addEventListener('resize', updateDimensions)
      thisEditor.editorModel = this.monaco.editor.createModel(thisEditor.content, 'xml')
      thisEditor.editorModel.onDidChangeContent(e => {
        thisEditor.content = thisEditor.editorModel.getValue()
      })
      if (thisEditor.Options.show.monacoDiff) {
        thisEditor.orgModel = this.monaco.editor.createModel(thisEditor.orgContent, 'xml')
        thisEditor.editor.setModel({'original': thisEditor.orgModel, 'modified': thisEditor.editorModel})
      } else {
        thisEditor.editor.setModel(thisEditor.editorModel)
        thisEditor.editor.onDidChangeCursorSelection(e => {
          thisEditor.selection = e.selection
        })
      }
    })
    thisEditor.$nextTick(() => {
      thisEditor.ready = true
    })
  }
  function loadMonacoEditor (thisEditor) {
    if (!thisEditor.$store.state.AmdRequire.amdRequire.config) {
      const nodeRequire = global.require
      const loaderScript = document.createElement('script')
      loaderScript.onload = () => {
        const amdRequire = global.require
        thisEditor.$store.commit('SET_AMD_REQUIRE', amdRequire)
        global.require = nodeRequire
        requireMonacoEditor(amdRequire, thisEditor)
      }
      loaderScript.setAttribute('src', '../../node_modules/monaco-editor/dev/vs/loader.js')
      document.body.appendChild(loaderScript)
    } else {
      requireMonacoEditor(thisEditor.$store.state.AmdRequire.amdRequire, thisEditor)
    }
  }
</script>

<style scoped>
  button.fx-btn {
    padding: 0px;
    background: none;
    border: none;
  }
  button.fx-btn:not([disabled]) {
    cursor: pointer;
  }
  #loading {
    position: fixed;
    background: rgba(0, 0, 0, 0.25);
    color: #fff;
    text-align: center;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    padding-top: calc( 50vh - 25px );
    font-size: 50px;
    line-height: 1;
  }

  .warning {
    color: #ad5900;
  }

  .project-path > p {
    white-space: nowrap;
    overflow: hidden;
    direction: rtl;
    text-align: left;
    text-overflow: ellipsis;
  }
</style>
