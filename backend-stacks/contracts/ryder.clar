;; ryder-nft
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)
(use-trait commission-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.commission-nft-ustx.commission-trait)

(define-non-fungible-token ryder uint)

;; Constants
(define-constant DEPLOYER tx-sender)
(define-data-var MINT-LIMIT u5000)

(define-constant err-not-authorized (err u403))
(define-constant err-not-found (err u404))

(define-constant err-invalid-id (err u500))
(define-constant err-listing (err u501))
(define-constant err-wrong-commission (err 502))

;; Variables
(define-map token-count principal uint)
(define-map metadata uint {tier: uint, seed: uint})

(define-data-var token-uri (string-ascii 80) "ipfs://ipfs/Qm../{id}.json")

(define-data-var admin principal tx-sender)
(define-data-var minter principal tx-sender)
(define-data-var burner principal tx-sender)

;;
;; mint and burn
;;
(define-public (mint (id uint))
  (begin
    (asserts! (is-allowed-minter contract-caller) err-not-authorized)
    (asserts! (and (> id 0) (<= id MINT-LIMIT) err-invalid-id))
    (nft-mint? ryder next-id tx-sender))))

(define-public (burn (id uint))
  (begin 
    (asserts! (or (is-allowed-burner contract-caller) (is-owner id tx-sender)) err-not-authorized)
    (nft-burn? ryder id tx-sender)))

;;
;; transfer methods
;;
(define-public (transfer (id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    (asserts! (is-none (map-get? market id)) err-listing)
    (trnsfr id sender recipient)))

(define-public (transfer-memo (id uint) (sender principal) (recipient principal)
(memo (buff 33)))
  (begin 
    (try! (transfer id sender recipient))
    (print memo)
    (ok true)))

(define-private (transfer-iter-fn (result (response bool uint)) (details {id:uint, sender: principal, recipient:
principal}))
  (if (is-ok result)
    (transfer (get id details) (get sender details) (get recipient details))
    (ok false)))

(define-public (transfer-many (list 200 {id:uint, sender: principal, recipient:
principal}))
  (fold transfer-iter-fn list (ok true)))

(define-private (transfer-memo-iter-fn (result (response bool uint)) (details {id:uint, sender: principal, recipient:
principal, memo: (buff 33)}))
  (if (is-ok result)
    (transfer-memo (get id details) (get sender details) (get recipient details)
    (get memo details))
    (ok false)))

(define-public (transfer-memo-many (list 200 {id:uint, sender: principal, recipient:
principal, memo: (buff 33)}))
  (fold transfer-memo-iter-fn list (ok true)))

(define-private (trnsfr (id uint) (sender principal) (recipient principal))
  (let
    ((sender-balance (get-balance sender))
    (recipient-balance (get-balance recipient)))
      (map-set token-count
        sender
        (- sender-balance u1))
      (map-set token-count
        recipient
        (+ recipient-balance u1))
      (nft-transfer? ryder id sender recipient)))

;; guard functions
(define-read-only (is-owner (id uint) (account principal))
    (is-eq account (unwrap! (nft-get-owner? ryder id) false)))

(define-read-only (is-sender-owner (id uint))
  (let ((owner (unwrap! (nft-get-owner? ryder id) false)))
    (or (is-eq tx-sender owner) (is-eq contract-caller owner))))

(define-read-only (is-admin  (account principal))
    (is-eq account (var-get admin)))

(define-read-only (is-allowed-minter (account principal))
  (is-eq account (var-get minter)))

(define-read-only (is-allowed-burner (account principal))
  (is-eq account (var-get burner)))

;; admin function
(define-public (set-token-uri (new-uri (string-ascii 80)))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (asserts! (not (var-get metadata-frozen)) err-metadata-frozen)
    (var-set token-uri new-uri)
    (ok true)))

(define-public (freeze-metadata)
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set metadata-frozen true)
    (ok true)))

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set admin new-admin)
    (ok true)))

;; read-only functions
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? ryder token-id)))

(define-read-only (get-last-token-id)
  (ok u5000))

(define-read-only (get-token-uri (token-id uint))
  (ok (var-get token-uri)))

(define-read-only (get-balance (account principal))
  (default-to u0
    (map-get? token-count account)))

;;
;; Non-custodial marketplace
;;
(define-map market uint {price: uint, commission: principal})

(define-read-only (get-listing-in-ustx (id uint))
  (map-get? market id))

(define-public (list-in-ustx (id uint) (price uint) (comm-trait <commission-trait>))
  (let ((listing  {price: price, commission: (contract-of comm-trait)}))
    (asserts! (is-sender-owner id) err-not-authorized)
    (map-set market id listing)
    (print (merge listing {action: "list-in-ustx", id: id}))
    (ok true)))

(define-public (unlist-in-ustx (id uint))
  (begin
    (asserts! (is-sender-owner id) err-not-authorized)
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
    (try! (trnsfr id owner tx-sender))
    (map-delete market id)
    (print {action: "buy-in-ustx", id: id})
    (ok true)))
  

