class ProductCard extends HTMLElement {
  connectedCallback() {
    const i = this.getAttribute('card-id')
    this.innerHTML = `
      <article
        class="product-card"
        data-signals__ifmissing="{name${i}: '', description${i}: '', price${i}: 0, qty${i}: 1, inCart${i}: false, originalPrice${i}: 0, visible${i}: false, countdown${i}: 300}"
        data-class="{highlight: $inCart${i}, visible: $visible${i}}"
        data-computed:line-total${i}="$price${i} * $qty${i}"
        data-on-intersect__once="$visible${i} = true"
        data-on-interval="$countdown${i} > 0 && $countdown${i}--"
      >
        <span class="name" data-text="$name${i}"></span>
        <span class="description" data-class="{collapsed: $inCart${i}}" data-text="$description${i}"></span>
        <div class="card-details" data-class="{collapsed: $inCart${i}}">
          <span
            data-text="'Sale ends in: ' + Math.floor($countdown${i} / 60) + ':' + String($countdown${i} % 60).padStart(2, '0')"
            data-show="$countdown${i} > 0"
            data-style:color="$countdown${i} > 60 ? 'green' : $countdown${i} > 10 ? 'orange' : 'red'"
          ></span>
          <div class="price-area">
            <span class="sale-badge" data-show="$originalPrice${i} > 0">SALE</span>
            <span class="price" data-text="'$' + $price${i}.toFixed(2)"></span>
            <span class="original-price" data-show="$originalPrice${i} > 0" data-text="'was $' + $originalPrice${i}.toFixed(2)"></span>
          </div>
          <div class="quantity-control">
            <button data-on:click="$qty${i} > 1 && $qty${i}--">-</button>
            <input type="number" data-bind:qty${i} />
            <button data-on:click="$qty${i} < 10 && $qty${i}++">+</button>
          </div>
          <span class="line-total" data-text="'Total: $' + $lineTotal${i}.toFixed(2)"></span>
          <button
            class="add-to-cart"
            data-on:click="$cartCount++, $inCart${i} = true, @post('/cart/add/${i}')"
            data-text="'Add to Cart'"
          ></button>
        </div>
        <div class="card-added" data-class="{collapsed: !$inCart${i}}">
          <span class="added-badge">✓ Added to cart</span>
          <button class="remove-from-cart" data-on:click="$cartCount--, $inCart${i} = false, @delete('/cart/${i}')">Remove from cart</button>
        </div>
      </article>
    `
  }
}

customElements.define('product-card', ProductCard)
