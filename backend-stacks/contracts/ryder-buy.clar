(define-constant contract-principal (as-contract tx-sender))

(define-constant err-unauthorized (err u403))
(define-constant err-not-allowed (err u508))
(define-constant err-mint-not-live (err u600))
(define-constant err-sold-out (err u601))
(define-constant err-failed (err u602))
(define-constant err-no-price (err u603))
(define-constant err-insufficient-balance (err u604))

(define-data-var buy-enabled bool false)
(define-data-var payment-recipient principal 'SP1YZSSPWJ5D3S1G48ZPW8NGXVG0K2TZJJXDM6N0Q)

(define-map tier-prices uint uint)
;; don't set tier u0
(map-set tier-prices u1 u1130000000)
(map-set tier-prices u2 u1130000000)
(map-set tier-prices u3 u1130000000)
(map-set tier-prices u4 u1130000000)
(map-set tier-prices u5 u1130000000)
(map-set tier-prices u6 u1130000000)
(map-set tier-prices u7 u1130000000)

(define-map admins principal bool)
(map-set admins tx-sender true)

(define-map token-mapping uint uint)

(define-private (mint-to-contract-iter (c (buff 1)) (p (response bool uint)))
	(contract-call? .ryder-nft mint contract-principal))

(define-public (mint-to-contract (iterations (buff 200)))
	(fold mint-to-contract-iter iterations (ok true)))

(define-read-only (get-tier-price (tier-id uint))
	(map-get? tier-prices tier-id))

(define-read-only (get-token-price (token-id uint))
	(map-get? tier-prices (contract-call? .ryder-nft get-tier-by-token-id token-id)))

(define-read-only (is-for-sale (token-id uint))
	(is-eq (contract-call? .ryder-nft get-owner token-id) (ok (some contract-principal))))

(define-public (buy (token-id uint))
	(let ((price (unwrap! (get-token-price token-id) err-no-price)))
		(unwrap! (stx-transfer? price tx-sender (var-get payment-recipient)) err-insufficient-balance)
		(asserts! (var-get buy-enabled) err-mint-not-live)
		(contract-call? .ryder-nft transfer token-id contract-principal tx-sender)))

;; admin function
(define-read-only (check-is-admin)
  (ok (asserts! (default-to false (map-get? admins contract-caller)) err-unauthorized)))

(define-public (set-buy-enabled (enabled bool))
	(begin
		(try! (check-is-admin))
		(ok (var-set buy-enabled enabled))))

(define-public (set-admin (new-admin principal) (value bool))
  (begin
    (try! (check-is-admin))
    (asserts! (not (is-eq tx-sender new-admin)) err-not-allowed)
    (ok (map-set admins new-admin value))))

(define-private (burn-iter (token-id uint) (previous (response bool uint)))
	(begin
		(try! previous)
		(as-contract (contract-call? .ryder-nft burn token-id))))

(define-public (burn-contract-tokens (token-ids (list 200 uint)))
	(begin
		(try! (check-is-admin))
		(fold burn-iter token-ids (ok true))))

(define-public (set-payment-recipient (recipient principal))
  (begin
    (try! (check-is-admin))
    (ok (var-set payment-recipient recipient))))

;; don't set u0
(define-public (set-price-in-ustx (tier-id uint) (price uint))
  (begin
    (try! (check-is-admin))
	(asserts! (> tier-id u0) err-failed)
    (ok (map-set tier-prices tier-id price))))
