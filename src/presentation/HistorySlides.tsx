import type { Slide } from './slide.ts'

export const historySlides: readonly Slide[] = [
  {
    // Preserve existing links to the original history introduction.
    id: 'history',
    title: 'Charles-Ange Laisant',
    body: () => (
      <div class="talk-history">
        <div>
          <p>
            <strong>1888 · A number system for permutations</strong>
          </p>
          <p>
            Laisant described factorial numbering and its application to
            permutations.
          </p>
          <p>
            The place values are factorials — 3!, 2!, 1!, 0! — instead of powers
            of ten. Multiply the digits by those place values to get a number.
          </p>
          <p class="talk-sources">
            <a href="https://www.numdam.org/articles/10.24033/bsmf.378/">
              Read Laisant’s 1888 paper
            </a>
          </p>
        </div>
        <figure class="talk-portrait">
          <img
            src="/portraits/charles-ange-laisant.jpg"
            width="960"
            height="1287"
            alt="Charles-Ange Laisant, photographed by Nadar"
          />
          <figcaption>
            <a href="https://commons.wikimedia.org/wiki/File:Laisant,_Charles-Ange,_Nadar,_Gallica.jpg">
              Nadar / BnF · restored by Jebulon
            </a>
            {' · '}
            <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>
          </figcaption>
        </figure>
      </div>
    ),
  },
  {
    id: 'history-lehmer',
    title: 'Derrick H. Lehmer',
    body: () => (
      <div class="talk-history">
        <div>
          <p>
            <strong>1960 · Teaching combinatorial tricks to a computer</strong>
          </p>
          <p>
            Lehmer brought these ideas into combinatorial computing. The
            encoding we use is known as a <strong>Lehmer code</strong>.
          </p>
          <p>
            Each digit tells us which remaining card to choose. Divide a number
            by factorial place values to recover those choices — and the cards.
            Let’s walk it through.
          </p>
          <p class="talk-sources">
            <a href="https://mediatum.ub.tum.de/doc/1543491/document.pdf">
              Read about Lehmer codes and their history
            </a>
          </p>
        </div>
        <figure class="talk-portrait">
          <img
            src="/portraits/derrick-henry-lehmer.jpg"
            width="823"
            height="1099"
            alt="Derrick Henry Lehmer in 1984, photographed by George M. Bergman"
          />
          <figcaption>
            <a href="https://commons.wikimedia.org/wiki/File:Derrick_Henry_Lehmer_1984_(rescanned,_cropped).jpg">
              George M. Bergman · crop and corrections by Filetime
            </a>
            {' · '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </a>
          </figcaption>
        </figure>
      </div>
    ),
  },
]
