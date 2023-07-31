import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/home',
      name: 'start-page',
      component: require('@/components/StartPage').default
    },
    {
      path: '/info',
      name: 'info-page',
      component: require('@/components/InfoPage').default
    },
    {
      path: '*',
      redirect: '/home'
    }
  ]
})
