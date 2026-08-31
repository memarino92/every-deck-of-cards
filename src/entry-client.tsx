import { createRouter, useLocation, useNavigate } from '@solidjs/router'
import { render } from '@solidjs/web'
import { onSettled } from 'solid-js'

import { CardGridPage } from './dev/CardGridPage.tsx'
import { HomePage } from './HomePage.tsx'
import { HowPage } from './HowPage.tsx'
import { Layout } from './Layout.tsx'
import { TalkPage } from './TalkPage.tsx'
import { WhyPage } from './WhyPage.tsx'
import './styles.css'

function ExploreRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  onSettled(() => {
    queueMicrotask(() => {
      navigate(`/${location.search}${location.hash}`, { replace: true })
    })
  })

  return null
}

const Router = createRouter({
  routes: [
    { path: '/talk', component: TalkPage },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '/', component: HomePage },
        { path: '/explore', component: ExploreRedirect },
        { path: '/dev/cards', component: CardGridPage },
        { path: '/why', component: WhyPage },
        { path: '/how', component: HowPage },
      ],
    },
  ],
})

// Start mode's document shell renders an empty <body> in client posture; the
// authored entry owns the mount, rendering straight into document.body.
render(() => <Router>{(props) => props.children}</Router>, document.body)
