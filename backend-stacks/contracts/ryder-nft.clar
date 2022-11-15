;; ryder-nft
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)
(use-trait commission-trait 'SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.commission-trait.commission)

(define-non-fungible-token ryder uint)

;; Constants
(define-constant DEPLOYER tx-sender)
(define-constant MAX-TOKENS u5003)
(define-constant MAX-MINT-PER-PRINCIPAL u2)
(define-constant TIER-LOWER-BOUNDS (list u103 u4368 u4868 u4968 u4988 u4998))

(define-constant TIER-LOWER-BOUND-T1 u103)
(define-constant TIER-LOWER-BOUND-T2 u4368)
(define-constant TIER-LOWER-BOUND-T3 u4868)
(define-constant TIER-LOWER-BOUND-T4 u4968)
(define-constant TIER-LOWER-BOUND-T5 u4988)
(define-constant TIER-LOWER-BOUND-T6 u4998)

;; Range for tier ids from 0 to 5002
;;     0-102: BASIC
;;  103-4367: JET BLACK
;; 4368-4867: SCHMELZE
;; 4868-4967: ARGENT
;; 4968-4987: DUTCH GOLD
;; 4988-4997: TOKYO LIGHTS
;; 4998-5002: RECHERCHE

(define-constant err-unauthorized (err u403))
(define-constant err-not-found (err u404))
(define-constant err-invalid-id (err u500))
(define-constant err-too-early (err u501))
(define-constant err-listing (err u502))
(define-constant err-wrong-commission (err u503))
(define-constant err-already-done (err u505))
(define-constant err-not-launched (err u506))
(define-constant err-max-mint-reached (err u507))
(define-constant err-fatale (err u999))

;; Variables
(define-data-var token-uri (string-ascii 80) "ipfs://ipfs/Qm../{id}.json")
(define-data-var mint-launched bool false)
(define-data-var price-in-ustx uint u1000000000)
(define-data-var token-id-nonce uint u1)
(define-data-var public-mint bool false)
(define-data-var mint-limit uint u2000)
(define-data-var payment-recipient principal tx-sender)

(define-map token-count principal uint)
(define-map allow-list principal bool)
(define-map mint-count principal uint)

(define-map admins principal bool)
(map-set admins tx-sender true)
;; Additional admins:
;; (map-set admins ... true)

;;
;; mint and burn
;;
(define-public (mint)
  (let ((sender-balance (get-balance tx-sender))
        (sender-mint-count (default-to u0 (map-get? mint-count tx-sender)))
        (token-id (var-get token-id-nonce))
        (public-mint-started (var-get public-mint)))
    (asserts! (var-get mint-launched) err-not-launched)
    (asserts! (< token-id (var-get mint-limit)) err-already-done)
    (asserts! (or (is-allow-listed tx-sender) public-mint-started) err-unauthorized)
    (asserts! (or (< sender-mint-count MAX-MINT-PER-PRINCIPAL) public-mint-started) err-max-mint-reached)
    (map-set token-count tx-sender (+ sender-balance u1))
    (map-set mint-count tx-sender (+ sender-mint-count u1))
    (var-set token-id-nonce (+ token-id u1))
    (try! (stx-transfer? (var-get price-in-ustx) tx-sender (var-get payment-recipient)))
    (nft-mint? ryder token-id tx-sender)))

(define-public (claim)
  (mint))

(define-public (claim-two)
  (begin
    (try! (mint))
    (mint)))

(define-public (claim-ten)
  ;; TODO
  err-fatale)

(define-public (claim-fifty)
  ;; TODO
  err-fatale)

(define-public (burn (id uint))
  (begin
    (asserts! (is-owner id tx-sender) err-unauthorized)
    (map-set token-count tx-sender (- (get-balance tx-sender) u1))
    (nft-burn? ryder id tx-sender)))

;;
;; transfer methods
;;
(define-public (transfer (id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-unauthorized)
    (asserts! (is-none (map-get? market id)) err-listing)
    (transfer-internal id sender recipient)))

(define-public (transfer-memo (id uint) (sender principal) (recipient principal) (memo (buff 33)))
  (begin 
    (try! (transfer id sender recipient))
    (print memo)
    (ok true)))

(define-private (transfer-iter-fn 
    (details {id: uint, sender: principal, recipient: principal}) 
    (result (response bool uint)))
  (if (is-ok result)
    (transfer (get id details) (get sender details) (get recipient details))
    (ok false)))

(define-public (transfer-many (recipients (list 200 {id: uint, sender: principal, recipient: principal})))
  (fold transfer-iter-fn recipients (ok true)))

(define-private (transfer-memo-iter-fn 
    (details {id: uint, sender: principal, recipient: principal, memo: (buff 33)})
    (result (response bool uint)))
  (if (is-ok result)
    (transfer-memo (get id details) (get sender details) (get recipient details)
    (get memo details))
    (ok false)))

(define-public (transfer-memo-many (recipients (list 200 {id: uint, sender: principal,
                                      recipient: principal, memo: (buff 33)})))
  (fold transfer-memo-iter-fn recipients (ok true)))

(define-private (transfer-internal (id uint) (sender principal) (recipient principal))
  (begin
    (map-set token-count sender (- (get-balance sender) u1))
    (map-set token-count recipient (+ (get-balance recipient) u1))
    (nft-transfer? ryder id sender recipient)))

;; guard functions
(define-read-only (is-owner (id uint) (account principal))
    (is-eq (some account) (nft-get-owner? ryder id)))

(define-read-only (is-sender-owner (id uint))
  (let ((owner (unwrap! (nft-get-owner? ryder id) false)))
    (or (is-eq tx-sender owner) (is-eq contract-caller owner))))

(define-read-only (is-admin  (account principal))
  (default-to false (map-get? admins account)))

;; admin function
(define-read-only (check-is-admin)
  (ok (asserts! (default-to false (map-get? admins tx-sender)) err-unauthorized)))

(define-public (set-token-uri (new-uri (string-ascii 80)))
  (begin
    (try! (check-is-admin))
    ;; TODO check if metadata is frozen
    (var-set token-uri new-uri)
    (ok true)))

(define-public (set-admin (new-admin principal) (value bool))
  (begin
    (try! (check-is-admin))
    (map-set admins new-admin value)
    (ok true)))

(define-public (set-launched (launched bool))
  (begin
    (try! (check-is-admin))
    (ok (var-set mint-launched launched))))

(define-public (set-public-mint (is-public-mint bool))
  (begin
    (try! (check-is-admin))
    (ok (var-set public-mint is-public-mint))))

(define-public (set-price-in-ustx (price uint))
  (begin
    (try! (check-is-admin))
    (ok (var-set price-in-ustx price))))

(define-private (set-allow-listed-iter (who principal))
  (map-set allow-list who true))

(define-public (set-allow-listed-many (entries (list 200 principal)))
  (begin
    (try! (check-is-admin))
    (ok (map set-allow-listed-iter entries))))

(define-public (set-mint-limit (limit uint))
  (begin
    (try! (check-is-admin))
    (asserts! (<= limit MAX-TOKENS) err-max-mint-reached)
    (ok (var-set mint-limit limit))))

(define-public (set-payment-recipient (recipient principal))
  (begin
    (try! (check-is-admin))
    (ok (var-set payment-recipient recipient))))

(define-public (shuffle-prepare)
  (begin
    (try! (check-is-admin))
    (asserts! (is-none (var-get shuffle-height)) err-already-done)
    (ok (var-set shuffle-height (some block-height)))))

(define-public (shuffle-ids)
    (ok
      (var-set dickson-parameter
        (mod (unwrap! (get-block-info? time (unwrap! (var-get shuffle-height) err-too-early)) err-fatale) MAX-TOKENS))))

;; read-only functions
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? ryder token-id)))

(define-read-only (get-last-token-id)
  (ok MAX-TOKENS))
  ;;(ok (- (var-get token-id-nonce) u1)))

(define-read-only (get-token-uri (token-id uint))
  (ok (some (var-get token-uri))))

(define-read-only (get-balance (account principal))
  (default-to u0
    (map-get? token-count account)))

(define-read-only (is-allow-listed (who principal))
  (default-to false (map-get? allow-list who)))

(define-read-only (get-price-in-ustx)
  (var-get price-in-ustx))

(define-read-only (get-token-id-nonce)
  (var-get token-id-nonce))

(define-read-only (get-mint-launched)
  (var-get mint-launched))

(define-read-only (get-public-mint)
  (var-get public-mint))

(define-read-only (get-mint-limit)
  (var-get mint-limit))

(define-read-only (get-payment-recipient)
  (var-get payment-recipient))

(define-read-only (get-mint-count (who principal))
  (default-to u0 (map-get? mint-count who)))

;;
;; Non-custodial marketplace
;;
(define-map market uint {price: uint, commission: principal})

(define-read-only (get-listing-in-ustx (id uint))
  (map-get? market id))

(define-public (list-in-ustx (id uint) (price uint) (comm-trait <commission-trait>))
  (let ((listing  {price: price, commission: (contract-of comm-trait)}))
    (asserts! (is-sender-owner id) err-unauthorized)
    (map-set market id listing)
    (print (merge listing {action: "list-in-ustx", id: id}))
    (ok true)))

(define-public (unlist-in-ustx (id uint))
  (begin
    (asserts! (is-sender-owner id) err-unauthorized)
    (map-delete market id)
    (print {action: "unlist-in-ustx", id: id})
    (ok true)))

(define-public (buy-in-ustx (id uint) (comm-trait <commission-trait>))
  (let ((owner (unwrap! (nft-get-owner? ryder id) err-not-found))
      (listing (unwrap! (map-get? market id) err-listing))
      (price (get price listing)))
    (asserts! (is-eq (contract-of comm-trait) (get commission listing)) err-wrong-commission)
    (try! (stx-transfer? price tx-sender owner))
    (try! (contract-call? comm-trait pay id price))
    (try! (transfer-internal id owner tx-sender))
    (map-delete market id)
    (print {action: "buy-in-ustx", id: id})
    (ok true)))
;;
;; calculate tier using dickson permutation with parameter 'a' defined by shuffle height
;; Permutation polynomial is x^5 + a*x^3 + 1/5*a^2*x + a
;; 1/5 = 3002 in finite field over 5003
(define-data-var shuffle-height (optional uint) none)
(define-data-var dickson-parameter uint u0)
(define-data-var ctx-tier-id uint u0)

(define-read-only (get-dickson-parameter)
  (var-get dickson-parameter))

(define-read-only (token-id-to-tier-id (token-id uint))
  (let ((a (var-get dickson-parameter)))
    (asserts! (is-some (var-get shuffle-height)) none)
    (some (dickson-5003-permut token-id a))))

(define-read-only (get-tier (tier-id uint))
  (begin
    (asserts! (>= tier-id TIER-LOWER-BOUND-T1) u1)
    (asserts! (>= tier-id TIER-LOWER-BOUND-T2) u2)
    (asserts! (>= tier-id TIER-LOWER-BOUND-T3) u3)
    (asserts! (>= tier-id TIER-LOWER-BOUND-T4) u4)
    (asserts! (>= tier-id TIER-LOWER-BOUND-T5) u5)
    (asserts! (>= tier-id TIER-LOWER-BOUND-T6) u6)
    u7))

(define-read-only (get-tier-by-token-id (token-id uint))
    (get-tier (unwrap! (token-id-to-tier-id token-id) u0)))

(define-read-only (dickson-5003-permut (x uint) (a uint))
  (mod (+ (pow x u5) (* a (pow x u3)) (* a a x u3002) a) MAX-TOKENS))

