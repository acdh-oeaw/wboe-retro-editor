<template>
  <div>
    <b-btn :title="isHeaderReady ? 'Bearbeitungshistory anzeigen' : 'taiHeader muss aktualisiert werden!'"
      @click="historyModalShow=true"
      :variant="isHeaderReady ? 'secondary' : 'danger'"
      :disabled="!(isArticle && isHeaderReady)">History</b-btn>
    <b-modal v-model="historyModalShow" scrollable size="xl" title="Bearbeitungshistory">
      <div v-if="isArticle && isHeaderReady && aEntry">
        <template v-for="(historyLine, hlKey) in newHistoryData">
          <div class="row mb-3" :key="hlKey" v-if="historyLine.target === '#' + aEntry.id">
            <div class="col-auto"><b-form-input type="date" v-model="historyLine.when" :state="historyLine.when.length > 0" style="width:190px;"></b-form-input></div>
            <div class="col"><b-form-input type="text" v-model="historyLine.txt" :state="historyLine.txt.length > 3"></b-form-input></div>
            <div class="col-auto"><b-form-select v-model="historyLine.who" :state="historyLine.who.length > 0" :options="[{value: '', text: 'Bitte auswählen!'}, ...teamMembers.map(tm => { return { value: '#' + tm.id, text: tm.name } })]" style="width:180px;"></b-form-select></div>
            <div class="col-auto"><b-btn @click="delEntry(hlKey)" title="Eintrag löschen!" variant="danger"><font-awesome-icon icon="trash-alt" /></b-btn></div>
            <!-- <div class="col-12">{{ historyLine.when }}</div> -->
          </div>
        </template>
        <b-btn @click="addEntry" title="Eintrag hinzufügen!" variant="primary">Eintrag hinzufügen</b-btn>
      </div>
      <div v-else>
        Hier ist was schief gelaufen!
      </div>
      <template #modal-footer><div class="w-100"><b-button variant="primary" size="sm" class="float-right" @click="historyModalShow=false">Schließen</b-button></div></template>
    </b-modal>
  </div>
</template>

<script>
  export default {
    name: 'History',
    props: {
      filesystem: Object,
      teamMembers: Array,
      headerData: Array
    },
    data () {
      return {
        historyModalShow: false,
        newHistoryData: [],
      }
    },
    mounted () {
    },
    computed: {
      isArticle () {
        return this.filesystem.selEntry === 0 || this.filesystem.selEntry > 0
      },
      isHeaderReady () {
        return this.filesystem.fileData.header.content.includes('<revisionDesc') && this.filesystem.fileData.header.content.includes('<listChange')
      },
      aEntry () {
        return this.historyModalShow && this.isArticle && this.isHeaderReady ? this.filesystem.fileData.entries[this.filesystem.selEntry] : null
      }
    },
    watch: {
      'historyModalShow' () {
        if (this.historyModalShow && this.isArticle && this.isHeaderReady) {
          console.log('historyModal', this.headerData)
          this.newHistoryData = JSON.parse(JSON.stringify(this.headerData))
        } else if (!this.historyModalShow) {
          if (JSON.stringify(this.newHistoryData) !== JSON.stringify(this.headerData)) {
            this.$emit('historyChanged', JSON.parse(JSON.stringify(this.newHistoryData)))
          }
        }
      },
      isArticle () {
        if (!this.isArticle) {
          this.historyModalShow = false
        }
      }
    },
    methods: {
      delEntry (k) {
        if (this.newHistoryData && this.newHistoryData[k]) {
          this.newHistoryData.splice(k, 1)
        }
      },
      addEntry () {
        var d = new Date()
        this.newHistoryData.push({target: '#' + this.aEntry.id, txt: '', when: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), who: ''})
      },
    }
  }
</script>

<style>
</style>