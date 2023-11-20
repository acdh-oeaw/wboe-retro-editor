<template>
  <div>
    <div class="lemma" v-html="lemma"></div>
    <div v-html="preview"></div>
  </div>
</template>

<script>
  let noNote = false
  let htmlHeader = []

  export default {
    name: 'Preview',
    props: {
      xml: String,
      xmlObj: Object
    },
    data () {
      return {
        lemma: '',
        preview: ''
      }
    },
    mounted () {
      this.updatePreview()
    },
    computed: {
    },
    watch: {
      xmlObj () {
        this.updatePreview()
      }
    },
    methods: {
      updatePreview () {
        console.log('updatePreview')
        let preview = this.renderer(this.xmlObj.content[0], '')
        // console.log(preview)
        let aLemma = this.xmlObj.family.filter((e) => e.name === 'form' && e.attributes && e.attributes.type && e.attributes.type === 'lemma' && e.parents && e.parents[0] && e.parents[0].name && e.parents[0].name === 'entry')
        this.lemma = (aLemma && aLemma[0]) ? aLemma[0].orgDOM.outerHTML : ''
        let aGramGrpPos = this.xmlObj.family.filter((e) => e.name === 'gram' && e.attributes && e.attributes.type && e.attributes.type === 'pos' && e.parents && e.parents[0] && e.parents[0].name && e.parents[0].name === 'gramGrp' && e.parents[0].parents && e.parents[0].parents[0] && e.parents[0].parents[0].name && e.parents[0].parents[0].name === 'entry')
        this.lemma = this.lemma + ((aGramGrpPos && aGramGrpPos[0]) ? aGramGrpPos[0].orgDOM.outerHTML : '')
        let aGramGrpGender = this.xmlObj.family.filter((e) => e.name === 'gram' && e.attributes && e.attributes.type && e.attributes.type === 'gender' && e.parents && e.parents[0] && e.parents[0].name && e.parents[0].name === 'gramGrp' && e.parents[0].parents && e.parents[0].parents[0] && e.parents[0].parents[0].name && e.parents[0].parents[0].name === 'entry')
        this.lemma = this.lemma + ((aGramGrpGender && aGramGrpGender[0]) ? aGramGrpGender[0].orgDOM.outerHTML : '')
        this.preview = this.xmlObj.content && this.xmlObj.content[0] ? preview : 'Fehler ...'
        this.htmlHeader = htmlHeader
      },
      renderer (e, t) {
        let out = ''
        if (e) {
          if (e.type === 'ELEMENT') {
            let classes = []
            let before = ''
            if (e.attributes && Object.keys(e.attributes).length > 0) {
              Object.keys(e.attributes).forEach((a) => {
                const av = e.attributes[a].trim()
                const ac = 'a-' + a.toLowerCase()
                // console.log(av, ac)
                classes.push(ac + ' ' + ac + '-' + av.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s/g, '-'))
                if (a === 'n') {
                  before += '<span class="fx-n">' + av + '</span>'
                }
              })
              // console.log(e)
            }
            if (!noNote && e.name === 'etym' && e.parents[0].name === 'entry' && htmlHeader.filter((h) => h.name === 'etym').length === 0 && htmlHeader.filter((h) => h.name === 'start').length === 0) {
              classes.push('etym-first-no-note')
              noNote = true
            }
            out += '<span class="element e-' + e.name + (classes.length > 0 ? ' ' + classes.join(' ') : '') + '">'
            if (!noNote && e.name === 'note' && e.parents[0].name === 'entry') {
              if (htmlHeader.filter((h) => h.name === 'start').length === 0) {
                out += '<div id="i-marker-start" class="i-marker"></div>'
                htmlHeader.push({name: 'start', id: 'start', top: 0})
              }
            }
            if (e.name === 'etym' && e.parents[0].name === 'entry') {
              let markerDg = htmlHeader.filter((h) => h.name === 'etym').length
              let markerId = 'etym' + (markerDg > 0 ? '-' + (markerDg + 1) : '')
              out += '<span class="fx-element a-type-header"><div id="i-marker-' + markerId + '" class="i-marker"></div><span class="ws"> </span>Etymologie</span>'
              htmlHeader.push({name: 'etym', id: markerId, top: 0})
            }
            if (e.attributes['type'] && e.attributes['type'].toLowerCase() === 'header') {
              let markerName = null
              if (e.childs && e.childs[0] && e.childs[0].type === 'TEXT') {
                markerName = e.childs[0].value.toLowerCase().replace(/[().:,]/g, '').replace(/ /g, '-').trim()
                const multiNames = {
                  'historische-belege': ['urkundlich', 'urkundl', 'urkdl-oft-belegt-auswahl', 'urkdl', 'urkundlich', 'histor-belege', 'hist-belege', 'historische-belege', 'urkdl-belege', 'ältere-spr', 'schreibungen-in-späterer-zeit-auswahl', 'belege-in-ält-spr', 'histor-formen', 'histor-belege', 'historische-belege'],
                  'wortbildung-komposita': ['trikomposs'],
                  'wortbildung-ableitung': ['abtlg'],
                  'synonyme': ['synonym', 'syn', 'synn', 'synn-u-sinnverwandte', 'synonyma', 'synn'],
                  'redewendungen': ['redensarten', 'stehende-wendungen-und-raa', 'redeww-mit-a', 'raa', 'redewendungen-und-redensarten', 'volkskundliches-und-raa', 'redensarten-und-sprüche', 'raa', 'sachliches-und-raa', 'redensarten-bauernregeln-und-volksglaube'],
                }
                Object.keys(multiNames).forEach((n) => {
                  if (multiNames[n] && multiNames[n].indexOf(markerName) > -1) {
                    markerName = n
                  }
                })
              } else {
                if (e.getXML().toLowerCase().indexOf('bestimmungswort') > -1 || e.getXML().toLowerCase().indexOf('als bestw') > -1) {
                  markerName = 'bestimmungswort'
                }
              }
              if (markerName) {
                let markerDg = htmlHeader.filter((h) => h.name === markerName).length
                let markerId = markerName + (markerDg > 0 ? '-' + (markerDg + 1) : '')
                out += '<div id="i-marker-' + markerId + '" class="i-marker"></div>'
                htmlHeader.push({name: markerName, id: markerId, top: 0})
              }
            }
            out += before
            if (e.childs && e.childs.length > 0) {
              e.childs.forEach((c) => {
                out += this.renderer(c, t)
              })
            }
            if (e.name === 'pc') {
              out += ' '
            }
            if (e.name === 'def' && e.parents[0].name === 're' && out.trim().slice(-1) === ',') {
              out += '<br>'
            }
            out += '</span>'
          } else if (e.type === 'TEXT') {
            const tVal = e.value.trim()
            if (tVal[0] !== ',' && tVal[0] !== '.' && tVal[0] !== ';' && tVal[0] !== ':' && tVal[0] !== ')' && tVal[0] !== ']' && tVal[0] !== '}') {
              out += '<span class="ws"> </span>'
            }
            if (tVal === 'Belegauswahl (Lautung)') {
              out += 'Lautung'
            // } else if (tVal === 'Wortbildung (Komposita)') {
            //   out += 'Wortbildung'
            } else {
              out += e.value
            }
            // console.log(e.value)
            t += tVal
          } else if (e.type === 'PROCESSING_INSTRUCTION') {
            out += '<span class="pi p-' + e.name + '">' + e.value + '</span>'
            t += e.value.trim()
          } else {
            console.log(e)
          }
        }
        return out
      },
    }
  }
</script>

<style>
  .lemma form[type="lemma"] {
    display: inline-block;
  }
  .lemma form[type="lemma"] > orth {
    display: inline-block;
    font-size: 2.5em;
  }
  .lemma form[type="lemma"] + form[type="lemma"]::before {
    content: ",";
  }
  .lemma gram[type="pos"],
  .lemma gram[type="gender"] {
    display: block;
  }

  .fx-header-info-btn {
    position: absolute;
    margin-top: 0;
    right: 0.75rem;
  }
  #i-marker-start {
    position: absolute;
    top: 0.5rem;
  }
  .e-entry {
    display: block;
  }
  .e-entry > .e-etym {
    display: block;
  }
  .e-entry > .e-form > .e-usg,
  .e-entry > .e-form > .a-type-diminutive {
    display: table;
  }
  .e-entry > .e-form.a-type-lemma,
  .e-entry > .e-gramGrp > .e-gram.a-type-pos,
  .e-entry > .e-gramGrp > .e-gram.a-type-gender {
    display: none;
  }
  .a-type-header {
    display: block;
    margin: 1rem 0 0.25rem 0;
    font-weight: bold;
    font-size: 1.1rem;
  }
  .a-type-header::before,
  .lemma::after {
    content: "";
    border-top: 1px solid #ddd;
    display: block;
    margin-left: -16px;
    margin-right: -16px;
    margin-bottom: 16px;
    margin-top: 16px;
  }
  .etym-first-no-note .a-type-header::before {
    content: none;
    display: none;
  }
  .etym-first-no-note .a-type-header {
    margin-top: 0;
  }
  .e-re {
    display: block;
  }
  .e-form.a-type.a-type-lemma.a-subtype.a-subtype-compound:first-child {
    margin-right: 2rem;
  }
  .e-note {
    display: block;
    margin-bottom: 1rem;
    padding-right: 1.5rem;
  }
  .e-sense.a-n {
    display: block;
    position: relative;
    margin-left: 2rem;
    margin-bottom: 0.5rem;
    margin-top: 0.5rem;
  }
  .fx-n {
    margin-right: 0.5rem;
  }
  .e-sense.a-n > .fx-n {
    position: absolute;
    left: -2rem;
    font-weight: bold;
  }
  .e-sense.a-n > .e-usg {
    display: block;
    margin-bottom: 0.3rem;
    letter-spacing: 0.15rem;
  }
  .e-sense > .e-sense {
    display: table;
  }
  .e-sense > .e-def:first-child {
    display: table;
  }
  .e-pb.a-facs {
    display: none;
  }
  .e-form.a-type.a-type-lemma.a-subtype.a-subtype-compound {
    font-style: italic;
  }
  .e-pRef {
    font-style: italic;
  }
  .e-q {
    font-style: italic;
  }
  .e-quote {
    font-style: italic;
  }
  .e-orth {
    font-style: italic;
  }
  .i-marker {
    position: relative;
  }
  .a-opt-true {
    letter-spacing: normal!important;
  }
  .e-re > .e-def {
    letter-spacing: 0.15rem;
  }
  
</style>