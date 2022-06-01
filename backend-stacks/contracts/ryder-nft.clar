;; ryder-nft
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)
(use-trait commission-trait 'SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.commission-trait.commission)

(define-non-fungible-token ryder uint)

;; Constants
(define-constant DEPLOYER tx-sender)
(define-constant MINT-LIMIT u4973)
(define-constant TIERS (list 0x01 0x02 0x03 0x04 0x05 0x06 0x07))

(define-constant err-not-authorized (err u403))
(define-constant err-not-found (err u404))
(define-constant err-invalid-id (err u500))
(define-constant err-invalid-tier (err u501))
(define-constant err-listing (err u502))
(define-constant err-wrong-commission (err u503))
(define-constant err-metadata-frozen (err u504))
(define-constant err-already-done (err u505))
(define-constant err-fatale (err u999))

;; Variables
(define-map token-count principal uint)
(define-map mint-info uint {tier: uint, mint-height: uint})

(define-data-var current-level uint u0)
(define-map levels uint uint)

(define-data-var token-uri (string-ascii 80) "ipfs://ipfs/Qm../{id}.json")
(define-data-var metadata-frozen bool false)


(define-data-var admin principal tx-sender)
(define-data-var minter principal tx-sender)
(define-data-var burner principal tx-sender)

;;
;; mint and burn
;;
(define-public (mint (id uint) (tier uint))
  (let ((sender-balance (get-balance tx-sender)))
    (asserts! (is-allowed-minter contract-caller) err-not-authorized)
    (asserts! (and (>= id u1) (<= id MINT-LIMIT)) err-invalid-id)
    (asserts! (and (>= tier u1) (<= tier u7)) err-invalid-tier)
    (map-set token-count tx-sender (+ u1 sender-balance))
    (map-set mint-info id {tier: tier, mint-height: block-height})
    (nft-mint? ryder id tx-sender)))

(define-public (burn (id uint))
  (let ((sender-balance (get-balance tx-sender)))
    (asserts! (or (is-allowed-burner contract-caller) (is-owner id tx-sender)) err-not-authorized)
    (map-set token-count tx-sender (+ u1 sender-balance))
    (print (nft-get-owner? ryder id))
    (nft-burn? ryder id tx-sender)))

;;
;; transfer methods
;;
(define-public (transfer (id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    (asserts! (is-none (map-get? market id)) err-listing)
    (trnsfr id sender recipient)))

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

(define-public (level-up-nfts)
  (let ((new-level (+ u1 (var-get current-level))))
    (asserts! (is-admin tx-sender) err-not-authorized)
    (asserts! (not (var-get metadata-frozen)) err-metadata-frozen)
    (asserts! (map-insert levels new-level block-height) err-already-done)
    (var-set current-level new-level)
    (ok true)))

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set admin new-admin)
    (ok true)))

(define-public (set-minter (new-minter principal))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set minter new-minter)
    (ok true)))

(define-public (set-burner (new-burner principal))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set burner new-burner)
    (ok true)))

;; read-only functions
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? ryder token-id)))

(define-read-only (get-last-token-id)
  (ok u5000))

(define-read-only (get-token-uri (token-id uint))
  (ok (some (var-get token-uri))))

(define-read-only (get-balance (account principal))
  (default-to u0
    (map-get? token-count account)))

(define-read-only (get-mint-info (token-id uint))
	(map-get? mint-info token-id))

(define-read-only (get-nft-seed (token-id uint))
	(let
		(
      (tier (get tier (unwrap! (map-get? mint-info token-id) err-not-found)))
      (tier-byte (unwrap! (element-at TIERS (- tier u1)) err-not-found))
			(level-up-height 
        (unwrap! (map-get? levels (var-get current-level)) 
          (ok (concat tier-byte 0x0000000000000000000000000000000000000000000000000000000000000000))))
			(nft-seed (concat tier-byte (sha256 (concat (sha256 token-id) (unwrap! (get-block-info? vrf-seed level-up-height) err-fatale)))))
		)
		(ok nft-seed)))
    
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
  

