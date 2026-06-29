class ProductCard extends HTMLElement {
  connectedCallback() {
    const i = this.getAttribute('card-id')
    this.innerHTML = `
      <article
        class="product-card"
        data-signals__ifmissing="{name${i}: '', description${i}: '', price${i}: 0, qty${i}: 1, inCart${i}: false, originalPrice${i}: 0, qtyInput${i}: null, visible${i}: false, countdown${i}: 300}"
        data-init="$originalPrice${i} = $price${i}"
        data-class="{highlight: $inCart${i}, visible: $visible${i}}"
        data-computed:line-total${i}="$price${i} * $qty${i}"
        data-on-intersect__once="$visible${i} = true"
        data-on-interval="$countdown${i} > 0 && $countdown${i}--"
      >
        <span class="name" data-text="$name${i}"></span>
        <span class="description" data-text="$description${i}"></span>
        <span
          data-text="'Sale ends in: ' + Math.floor($countdown${i} / 60) + ':' + String($countdown${i} % 60).padStart(2, '0')"
          data-show="$countdown${i} > 0"
          data-style:color="$countdown${i} > 60 ? 'green' : $countdown${i} > 10 ? 'orange' : 'red'"
        ></span>
        <span class="price" data-text="'$' + $price${i}.toFixed(2)"></span>
        <span data-text="'Original: $' + $originalPrice${i}"></span>
        <div class="quantity-control">
          <button data-on:click="$qty${i} > 1 && $qty${i}--">-</button>
          <input type="number" data-bind:qty${i} data-ref:qty-input${i} />
          <button data-on:click="$qty${i} < 10 && $qty${i}++">+</button>
        </div>
        <span class="line-total" data-text="'Total: $' + $lineTotal${i}.toFixed(2)"></span>
        <button
          class="add-to-cart"
          data-on:click="!$inCart${i} && ($cartCount++, $inCart${i} = true, $qtyInput${i}.focus())"
          data-attr:disabled="$inCart${i}"
          data-text="$inCart${i} ? 'Added' : 'Add to Cart'"
        ></button>
      </article>
    `
  }
}

customElements.define('product-card', ProductCard)
