<template>
  <div class="start-page mib50 d-flex flex-column flex-grow-1">
    <div class="container-fluid d-flex flex-column h-100 flex-grow-1">
      <b-alert show variant="danger" v-if="Object.keys(filesystem.errors).length > 0">
        <ul class="my-0">
          <li v-for="(err, i) in filesystem.errors" :key="'e' + i"><b>{{ i }}:</b> {{ err }}</li>
        </ul>
      </b-alert>
      <div class="project-path d-flex flex-column h-100 flex-grow-1" v-if="Options.projectPath">
        <div class="mt-3">
          <font-awesome-icon icon="project-diagram" class="mir10" style="float:left;" />
          <p>
            <!-- Projektpfad -->
            {{ Options.projectPath }}
            <button @click="selectFolder" title="Verzeichniss ändern" class="fx-btn" :disabled="changed"><font-awesome-icon icon="edit" class="mil5 mir5"/></button>
            <button @click="showFolder" title="Ordner in Explorer öffnen" class="fx-btn" :disabled="changed"><font-awesome-icon icon="external-link-alt" class="mil5 mir5"/></button>
            <button @click="updateFolder" title="Projektpfad neu laden" class="fx-btn" :disabled="changed"><font-awesome-icon icon="sync-alt" class="mil5 mir5"/></button>
          </p>
        </div>
        <div class="mb-3">
          <b-button-toolbar class="main-toolbar">
            <b-input-group class="pr-3 mw33p">
              <b-form-select v-model="filesystem.selFile" :options="filesystem.files" :disabled="changed"></b-form-select>
            </b-input-group>
            <b-input-group class="pr-3 mw33p">
              <b-form-select v-model="filesystem.selEntry" :options="filesystem.entry" :disabled="!filesystem.selFile"></b-form-select>
            </b-input-group>
            <b-input-group class="pr-3 mw33p">
              <History :headerData="newHistoryData" :filesystem="filesystem" :teamMembers="teamMembers" @historyChanged="historyChanged" />
            </b-input-group>
            <b-input-group class="pr-3 mw33p">
              <b-btn title="Änderungen speichern" @click="save" variant="primary" :disabled="!changed">Speichern</b-btn>
            </b-input-group>
            <b-input-group class="pr-3 mw33p">
              <b-btn title="Änderungen verwerfen" @click="discard" variant="warning" :disabled="!changed">Verwerfen</b-btn>
            </b-input-group>
          </b-button-toolbar>
        </div>
        <div class="flex-grow-1" style="position: relative;">
          <div class="row" style="position: absolute; left:0; right: 0; width: calc(100% + 30px); height: 100%;">
            <div :class="(Options.options.showPreview ? 'col-6' : 'col-12') + ' h-100'">
              <div id="editor" style="border: 1px solid #aaa;" class="h100" autofocus></div>
            </div>
            <div class="col-6 h-100" v-if="Options.options.showPreview">
              <div :style="'border: 1px solid ' + (changed ? '#daa' : '#aaa') + '; background-color: ' + (changed ? '#eee' : '#fff') + '; overflow: auto;'" class="h100 p-3">
                <Preview :xml="orgContent" :xmlObj="xmlObj" v-if="orgContent && filesystem.selEntry > -1" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <b-alert show variant="danger" v-else>Projektpfad nicht vergeben!</b-alert>
      <div id="loading" v-if="loading">Lade ...</div>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'
  import Preview from './StartPage/Preview'
  import History from './StartPage/History'
  import XmlObject from '../functions/xml/Xml'
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
            header: {
              content: '',
              historyData: [],
              pos: { start: 0, end: 0 }
            },
            entries: []
          },
          selEntry: -1,
          entry: [{ value: -1, text: 'Eintrag auswählen ...' }],
          errors: {}
        },
        aSelEntry: null,
        content: '',
        orgContent: '',
        newHistoryData: [],
        selection: {},
        monaco: {},
        editor: {},
        editorModel: null,
        orgModel: null,
        xmlObj: {},
        headerChangeData: null,
        teamMembers: [
          { name: 'Alexandra N. Lenz', id: 'AL' },
          { name: 'Philipp Stöckle', id: 'PhS' },
          { name: 'Andreas Gellan', id: 'AG' },
          { name: 'Patrick Zeitlhuber', id: 'PZ' },
          { name: 'Sabine Wahl', id: 'SW' },
          { name: 'Sonja Schwaiger', id: 'SS' },
          { name: 'Angela Bergermayer', id: 'AB' },
          { name: 'Eva Wahlmüller', id: 'EW' },
          { name: 'David Gschösser', id: 'DG' },
          { name: 'Stefanie Schöberl', id: 'StS' },
          { name: 'Fabian Fleißnerv', id: 'FF' },
          { name: 'Markus Kunzmann', id: 'MK' },
          { name: 'Agnes Kim', id: 'AK' },
          { name: 'Ingeborg Geyer', id: 'IG' },
          { name: 'Katharina Korecky-Kröllv', id: 'KK' },
          { name: 'Manfred Glauningerv', id: 'MG' }
        ]
      }
    },
    mounted () {
      this.updateFolder()
      this.$nextTick(() => {
        loadMonacoEditor(this)
      })
    },
    methods: {
      save () {
        if (this.changed) {
          let aFile = this.Options.projectPath + '\\' + this.filesystem.selFile
          let newFileContent = this.filesystem.fileData.content
          if (this.filesystem.selEntry === 'teiHeader') {
            newFileContent = this.filesystem.fileData.content.slice(0, this.filesystem.fileData.header.pos.start) + this.content + this.filesystem.fileData.content.slice(this.filesystem.fileData.header.pos.end)
            console.log('teiHeader')
          } else {
            let entry = this.filesystem.fileData.entries[this.filesystem.selEntry]
            newFileContent = this.filesystem.fileData.content.slice(0, entry.pos.start) + this.content + this.filesystem.fileData.content.slice(entry.pos.end)
            console.log('Speichern ...', entry, entry.pos.start, entry.pos.end, [aFile, newFileContent])
            if (this.headerChangeData) {
              let newHistoryContent = this.newHistoryData.sort((a, b) => { var targetDiff = a.target.localeCompare(b.target); return targetDiff === 0 ? a.when.localeCompare(b.when) : targetDiff })
                                                         .map(h => '<change target="' + h.target + '" who="' + h.who + '" when="' + h.when + '">' + this.clearText(h.txt) + '</change>')
              let newHeaderContent = this.filesystem.fileData.header.content
              newHeaderContent = newHeaderContent.replace(
                /(\t*)(<revisionDesc>[\S\s]*<listChange>)([\S\s]*)(<\/listChange>[\S\s]*<\/revisionDesc>)/gim,
                '$1$2\n$1\t\t' + newHistoryContent.join('\n$1\t\t') + '\n$1\t$4'
              )
              newFileContent = newFileContent.slice(0, this.filesystem.fileData.header.pos.start) + newHeaderContent + newFileContent.slice(this.filesystem.fileData.header.pos.end)
              console.log('headerChangeData', [newHeaderContent, newFileContent])
            }
          }
          this.filesystem.errors = {}
          if (this.checkXMLData('\n' + this.content)) {
            if (this.checkXMLData('\n' + newFileContent)) {
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
              alert('Datei konnte nicht gespeichert werden! (nFC)')
            }
          } else {
            alert('Datei konnte nicht gespeichert werden! (c)')
          }
        }
      },
      discard () {
        if (confirm('Änderungen wirklich verwerfen?')) {
          this.updateSelEntry()
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
        this.filesystem.fileData.header = {
          content: '',
          historyData: [],
          pos: { start: 0, end: 0 }
        }
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
        this.filesystem.fileData.header = {
          content: '',
          historyData: [],
          pos: { start: 0, end: 0 }
        }
        this.newHistoryData = []
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
            let lemmaId = ''
            let eId = null
            let inNode = null
            let lText = ''
            parser.onerror = (e) => {
              console.log('saxes error:', e)
              this.filesystem.errors['XMLError' + errDg] = 'XML Fehler!\n' + e.message
              errDg += 1
            }
            parser.onopentag = (node) => {
              if (node.name === 'entry') {
                ePos = parser.startTagPosition - 1
                if (node.attributes['xml:id']) {
                  eId = node.attributes['xml:id']
                }
              }
              if (node.name === 'teiHeader') {
                hPos = parser.startTagPosition - 1
                this.filesystem.fileData.header.pos.start = hPos
              }
              if (node.name === 'change' && this.filesystem.fileData.header.pos.end === 0) {
                inNode = node.attributes
              }
              if (node.name === 'form' && node.attributes && node.attributes.type && node.attributes.type === 'lemma' && node.attributes['xml:id']) {
                lemmaId = lemmaId + node.attributes['xml:id'].trim()
              }
              lText = ''
            }
            parser.ontext = (txt) => {
              lText += txt
            }
            parser.onclosetag = (tag) => {
              if (tag === 'entry') {
                let aTitle = (lemmaId || 'Unbekannt!').trim()
                this.filesystem.fileData.entries.push({
                  nr: eDg,
                  title: aTitle,
                  id: eId || lemmaId || ('nr_' + eDg),
                  content: this.filesystem.fileData.content.slice(ePos, parser.position),
                  pos: {
                    start: ePos,
                    end: parser.position
                  }
                })
                this.filesystem.entry.push({ value: eDg, text: aTitle })
                lemmaId = ''
                eId = null
                eDg += 1
              }
              if (tag === 'teiHeader') {
                this.filesystem.fileData.header.content = this.filesystem.fileData.content.slice(hPos, parser.position)
                this.filesystem.fileData.header.pos.end = parser.position
                this.filesystem.entry.push({ value: 'teiHeader', text: 'teiHeader' })
              }
              if (tag === 'change' && inNode) {
                inNode.txt = lText
                this.filesystem.fileData.header.historyData.push(inNode)
                inNode = null
              }
              lText = ''
            }
            parser.onprocessinginstruction = (node) => {
            }
            parser.onend = () => {
              this.newHistoryData = JSON.parse(JSON.stringify(this.filesystem.fileData.header.historyData))
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
        if (this.filesystem.selEntry === 'teiHeader') {
          this.filesystem.errors = {}
          this.content = this.filesystem.fileData.header.content
          this.orgContent = this.content
          this.newHistoryData = JSON.parse(JSON.stringify(this.filesystem.fileData.header.historyData))
          this.xmlObj = new XmlObject.XmlBase(this.orgContent, () => void 0)
          let revisionDesc = this.xmlObj.family.filter((e) => e.name === 'revisionDesc')
          if (!(revisionDesc && revisionDesc[0])) {
            this.content = this.content.replace(
              /(\t*)(<\/fileDesc>)/gim,
              '$1$2\n$1<revisionDesc>\n$1\t<listChange>\n$1\t</listChange>\n$1</revisionDesc>'
            )
          }
          // Namen hinzufügen!
          let resp = this.xmlObj.family.filter((e) => e.name === 'resp' && e.getValue()[0].indexOf('DBOE Team') > -1)
          if (!(resp && resp[0])) {
            this.content = this.content.replace(
              /(\t*)(<\/titleStmt>)/gim,
              '$1\t<respStmt>\n$1\t\t<resp>DBOE Team</resp>\n$1\t</respStmt>\n$1$2'
            )
          }
          var teamMembers = JSON.parse(JSON.stringify(this.teamMembers)).reverse()
          let teamMembersFiltered = teamMembers.filter((e) => this.xmlObj.family.filter((e2) => e2.name === 'name' && e2.attributes['xml:id'] && e2.attributes['xml:id'] === e.id).length === 0)
          teamMembersFiltered.forEach(teamMember => {
            this.content = this.content.replace(
              /(\t*)(<resp>DBOE Team<\/resp>)/gim,
              '$1$2\n$1<name xml:id="' + (teamMember.id) + '">' + (teamMember.name) + '</name>'
            )
          })
        } else if (this.filesystem.selEntry > -1 && this.filesystem.fileData.entries[this.filesystem.selEntry] && this.filesystem.fileData.entries[this.filesystem.selEntry].content) {
          this.filesystem.errors = {}
          this.content = this.filesystem.fileData.entries[this.filesystem.selEntry].content
          this.orgContent = this.content
          this.newHistoryData = JSON.parse(JSON.stringify(this.filesystem.fileData.header.historyData))
          this.xmlObj = new XmlObject.XmlBase(this.orgContent, () => void 0)
          let entryWithId = this.xmlObj.family.filter((e) => e.name === 'entry' && e.attributes['xml:id'])
          if ((entryWithId && entryWithId[0] ? entryWithId[0].attributes['xml:id'] : null) !== this.filesystem.fileData.entries[this.filesystem.selEntry].id) {
            this.content = this.content.replace(
              /(<entry[^>]*)(>)/gim,
              '$1 xml:id="entry-' + this.filesystem.fileData.entries[this.filesystem.selEntry].id + '"$2'
            )
          }
          // console.log('updateSelEntry', {entry: this.filesystem.fileData.entries[this.filesystem.selEntry], xmlObj: this.xmlObj, content: this.content})
        } else {
          this.content = ''
          this.orgContent = ''
          this.xmlObj = {}
        }
        this.headerChangeData = null
        this.editorModel.setValue(this.content)
        if (this.Options.show.monacoDiff) {
          this.orgModel.setValue(this.orgContent)
          this.editor.setModel({'original': this.orgModel, 'modified': this.editorModel})
        } else {
          this.editor.setModel(this.editorModel)
        }
      },
      historyChanged (changedHistoryData) {
        console.log('historyChanged', changedHistoryData)
        this.newHistoryData = JSON.parse(JSON.stringify(changedHistoryData))
        this.headerChangeData = true
      },
      clearText (txt) {
        var clearedTxt = document.createElement('div')
        clearedTxt.textContent = txt
        return clearedTxt.innerHTML
      }
    },
    computed: {
      ...mapState(['Options']),
      changed () {
        return this.headerChangeData || ((this.aSelEntry === 'teiHeader' || (this.aSelEntry > -1 && this.filesystem.fileData.entries[this.aSelEntry])) && this.content !== this.orgContent)
      }
    },
    watch: {
      'filesystem.selEntry' (nVal, oVal) {
        if (nVal !== this.aSelEntry) {
          if (this.changed) {
            if (confirm('Änderungen wirklich verwerfen?')) {
              this.updateSelEntry()
              this.aSelEntry = nVal
            } else {
              this.$nextTick(() => {
                this.$set(this.filesystem, 'selEntry', oVal)
              })
              console.log(this.aSelEntry, this.filesystem.selEntry, oVal)
            }
          } else {
            this.updateSelEntry()
            this.aSelEntry = nVal
          }
        }
      },
      changed () {
        console.log('changed ...', this.changed)
        this.$emit('changed', this.changed)
      },
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
      'Options.options.showPreview' () {
        this.$nextTick(() => {
          this.editor.layout()
        })
      }
    },
    components: {
      Preview,
      History
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
